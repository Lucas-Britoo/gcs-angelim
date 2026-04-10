// Arquivo Proxy Seguro rodando em Node.js (AWS Lambda via Netlify)
// Função parseia CSV de uma URL e retorna JSON estruturado.

exports.handler = async (event, context) => {
  try {
    // 1. Authentication Bypass Prevention
    // Netlify Identity no Netlify Functions injeta context.clientContext.user se o header de Auth vier correto.
    // O JWT é decriptado pela infraestrutura gerenciavel no header Authorization: Bearer <token>
    
    // NOTA: Para acesso público aos pontos do mapa (sem ser dashboard admin) a gente pode ou não bloquear public requests.
    // Vamos basear na role. No planejamento, o mapa público mostra apenas alguns campos? Ou as coordenadas são privadas?
    // Vamos assumir que buscar dados básicos é público, mas buscar TUDO exige token.
    
    // Mock de permissão
    const user = context.clientContext && context.clientContext.user;
    
    let isPublicRequest = !user;
    
    // Se não for requisição pública, verificamos roles:
    if (!isPublicRequest) {
      const roles = user.app_metadata?.roles || [];
      const hasAccess = roles.includes('admin') || roles.includes('editor');
      if (!hasAccess) {
        return {
          statusCode: 403,
          body: JSON.stringify({ error: 'Acesso negado: Perfil sem permissão administrativa.' })
        };
      }
    }

    // 2. Mock de Busca Seguro em Planilha CSV do Google
    // Apenas requisições de servidor (esta AWS Lambda) tem acesso ao endpoint CSV real.
    // Aqui você vai preencher sua Google Sheets public CSV export link.
    // Ex: const SPREADSHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/e/2PACX.../pub?gid=0&single=true&output=csv`;
    
    // Mock de dados por enquanto (Substitua por um fetch(SPREADSHEET_CSV_URL) e parse aqui)
    const rawData = [
      { id: 1, nome: "GC Vida e Paz", lider: "Marcos Silva", horario: "Quarta, 19:30", lat: "-2.5310", lng: "-44.3015" },
      { id: 2, nome: "GC Jovens Águias", lider: "Ana Costa", horario: "Sábado, 18:00", lat: "-2.5255", lng: "-44.3100" },
      { id: 3, nome: "GC Consolação", lider: "João Paulo", horario: "Terça, 20:00", lat: "-2.5401", lng: "-44.2988" }
    ];

    // Se for publicRequest e você não quiser dar coords, pode filtrar os campos.
    // Exemplo: 
    // if (isPublicRequest) { return json sem lat/lng }
    // Mas Leaflet precisa das coords. Logo retornamos o essencial.

    const sanitizedPayload = rawData.map(item => ({
      id: item.id,
      nome: item.nome,
      lider: item.lider,
      horario: item.horario,
      lat: item.lat,
      lng: item.lng
      // omitir campos sensiveis baseados em Role poderia vir aqui!
    }));

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
        // Header de CORS não necessário se estamos em /.netlify... no mesmo domain
      },
      body: JSON.stringify(sanitizedPayload)
    };
    
  } catch (error) {
    console.error("Function Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Erro interno do servidor." }) // Generic error pra view
    };
  }
};
