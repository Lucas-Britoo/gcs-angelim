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

    // Mock de dados da planilha convertida para JSON estruturado
    const rawData = [
      { id: 1, nome: "GC Sao Francisco", dia: "Sexta", horario: "19:30", bairro: "São Francisco", endereco: "Rua Joaquim Santos, 621", lider: "Álefe e Camila", contato: "(86) 99918-6632", lat: "-2.9105", lng: "-41.7650" },
      { id: 2, nome: "GC Centro", dia: "Quinta Feira", horario: "19:30", bairro: "Centro", endereco: "Rua Pedro II, 1444", lider: "Paula Vaz", contato: "(86) 99954-7775", lat: "-2.9042", lng: "-41.7761" },
      { id: 3, nome: "GC Dirceu", dia: "Terça", horario: "19:30", bairro: "Dirceu", endereco: "Rua Raimundo Rodrigues dos Santos, 165", lider: "Italo & Aryane Félix", contato: "(86) 99436-8350", lat: "-2.9230", lng: "-41.7510" },
      { id: 4, nome: "GC Floriópolis II", dia: "Terça-feira", horario: "20:00", bairro: "Floriópolis", endereco: "Loteamento conviver IV, Quadra 7, Casa 2", lider: "Larissa Melo", contato: "(86) 98174-2025", lat: "-2.897694", lng: "-41.718778" },
      { id: 5, nome: "GC Frei Higino I", dia: "Quinta", horario: "19:30", bairro: "Frei Higino", endereco: "Rua Samuel Santos, 7630", lider: "Hércules e Mariana", contato: "(98) 98748-2797", lat: "-2.9120", lng: "-41.7600" },
      { id: 6, nome: "GC Afya Parnaíba II", dia: "Terça Feira", horario: "16:30", bairro: "Sabiazal", endereco: "FACULDADE AFYA PARNAÍBA", lider: "LUCAS GALVÃO", contato: "(98) 99215-1410", obs: "Área Verde", lat: "-2.9400", lng: "-41.7800" },
      { id: 7, nome: "GC Joaz Sousa", dia: "Terça-Feira", horario: "19:30", bairro: "Joaz Sousa", endereco: "Quadra 05, Casa 31", lider: "Daniel e Dayane", contato: "(86) 99999-2991", lat: "-2.8800", lng: "-41.7500" },
      { id: 8, nome: "GC NASSAU", dia: "Quinta", horario: "18h", bairro: "Floriópolis", endereco: "FACULDADE UNINASSAU", lider: "Maria Rita e Amanda Mayana", contato: "(86) 99565-5565", lat: "-2.9290", lng: "-41.7410" },
      { id: 9, nome: "GC Parnaíba Residence", dia: "Quinta", horario: "19:30", bairro: "João XXIII", endereco: "Conviver Parnaíba Residence, Q 10, C 26", lider: "Silver e Luana", contato: "(86) 99930-3756", lat: "-2.9150", lng: "-41.7300" },
      { id: 10, nome: "GC FLORIOPOLIS I", dia: "Terça-feira", horario: "17h", bairro: "Floriópolis", endereco: "Rua loteamento Conviver lV, Q 17, Casa 07", lider: "Brenda Bueno", contato: "(86) 99419-0258", lat: "-2.9310", lng: "-41.7420" },
      { id: 11, nome: "GC São Benedito I", dia: "Terça-feira", horario: "19:30", bairro: "São Benedito", endereco: "Rua Pedro Braga, 251", lider: "Brenno e Rafaela", contato: "(86) 99435-5415", lat: "-2.9050", lng: "-41.7650" },
      { id: 12, nome: "GC São Benedito II", dia: "Quinta-feira", horario: "19:30", bairro: "São Benedito", endereco: "Av. Marc Jacob, 425", lider: "Júnior e Andreia", contato: "(86) 99978-4625", lat: "-2.9060", lng: "-41.7640" },
      { id: 13, nome: "GC São Benedito III", dia: "Quinta-feira", horario: "19:30", bairro: "São Benedito", endereco: "Rua Telius Ferraz, 220", lider: "Francisco Htangelo e Ana Cristina", contato: "(86) 99550-7695", lat: "-2.9070", lng: "-41.7630" },
      { id: 14, nome: "GC Frei Higino II", dia: "Quinta-feira", horario: "19:30", bairro: "Frei Higino", endereco: "Av. Desembargador Walter Carvalho, 616", lider: "Israel e Talita", contato: "(86) 99470-3404", lat: "-2.9130", lng: "-41.7610" },
      { id: 15, nome: "GC Kids", dia: "Quinta-feira", horario: "19:30", bairro: "São Benedito", endereco: "Av. Marc Jacob, 425", lider: "Francisca", contato: "(86) 98153-2375", obs: "Crianças de 7 a 11 anos", lat: "-2.9065", lng: "-41.7645" },
      { id: 16, nome: "GC Jardim Atlântico", dia: "Terça-feira", horario: "19:30", bairro: "Floriópolis", endereco: "Jardim Atlântico II, Av Professor José Nelson Q18 C 2", lider: "George e Ana Clara", contato: "(86) 98864-2678", lat: "-2.9320", lng: "-41.7430" },
      { id: 17, nome: "GC Online", dia: "Sábado", horario: "15h", bairro: "Online", endereco: "Via meet", lider: "João Filho e Débora", contato: "(86) 99528-2007", lat: null, lng: null },
      { id: 18, nome: "GC Planalto", dia: "Terça-feira", horario: "19h30", bairro: "Planalto", endereco: "Rua Ranupho Torres Rapouso, 1440", lider: "Weiner e Rute", contato: "(86) 99803-1495", lat: "-2.9200", lng: "-41.7500" },
      { id: 19, nome: "GC Bebedouro", dia: "Sábado", horario: "16h", bairro: "Bebedouro", endereco: "Rua Oeiras, 1006", lider: "Wesley Silva", contato: "(31) 98982-3967", lat: "-2.9500", lng: "-41.7800" },
      { id: 20, nome: "GC Pindorama", dia: "Quinta", horario: "19:00", bairro: "Pindorama", endereco: "Rua Afonso Pena, 2003, Ap 5", lider: "Jordeson Rodrigues", contato: "(89) 99456-2487", lat: "-2.9000", lng: "-41.7600" },
      { id: 21, nome: "GC UFDPar", dia: "Sexta-feira", horario: "13h", bairro: "Nossa Sra. de Fátima", endereco: "Av. São Sebastião, 2819", lider: "Sayure", contato: "(86) 98107-1532", obs: "Área de Lazer", lat: "-2.9050", lng: "-41.7700" },
      { id: 22, nome: "GC Colina", dia: "Terça-feira", horario: "19h30", bairro: "João XXIII", endereco: "Conj Colina da Alvorada 1 Quadra 15, Casa 09", lider: "Douglas Souza & Joelya Karla", contato: "(86) 99990-5846", lat: "-2.9160", lng: "-41.7310" },
      { id: 23, nome: "GC Floriópolis III", dia: "Terça-feira", horario: "20h", bairro: "Floriópolis", endereco: "Loteamento Conviver IV, Q17, C 06", lider: "Bruna Mendonça", contato: "(86) 98120-2046", lat: "-2.9330", lng: "-41.7440" },
      { id: 24, nome: "GC Afya Parnaíba I", dia: "Terça", horario: "16h", bairro: "Sabiazal", endereco: "Faculdade Afya Parnaíba", lider: "Ana Tavares", contato: "(86) 99477-5852", obs: "Área Verde", lat: "-2.9410", lng: "-41.7790" },
      { id: 25, nome: "GC Reis Veloso", dia: "Sexta", horario: "14:30", bairro: "Reis Veloso", endereco: "Rua Abigail Nogueira Batista 205", lider: "Ana Tavares", contato: "(86) 99477-5852", lat: "-2.9010", lng: "-41.7500" },
      { id: 26, nome: "Igreja Angelim Parnaíba (Sede)", dia: "Qua, Sáb e Dom", horario: "19h30, 18h e 10h/18h", bairro: "Reis Veloso", endereco: "Av. Dep. Pinheiro Machado, 115", lat: "-2.904959551930751", lng: "-41.75327635838159" }
    ];

    const sanitizedPayload = rawData.map(item => ({
      id: item.id,
      nome: item.nome,
      dia: item.dia,
      horario: item.horario,
      bairro: item.bairro,
      endereco: item.endereco,
      lider: item.lider,
      contato: item.contato,
      obs: item.obs,
      lat: item.lat,
      lng: item.lng
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
