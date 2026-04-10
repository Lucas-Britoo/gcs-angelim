// Arquivo Proxy Seguro rodando em Node.js (AWS Lambda via Netlify)
// Função busca GCs do Supabase e retorna JSON estruturado com Otimização de Edge Cache.

exports.handler = async (event, context) => {
  try {
    // 🛡️ Zero-Trust Security: Prioriza chaves injetadas pela Netlify invisivelmente,
    // mas faz fallback pras suas chaves caso esqueça de setá-las no painel.
    const SUPABASE_URL = process.env.SUPABASE_URL || "https://ubxrhqehclgrpyzenuum.supabase.co";
    const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || "sb_secret__iSvdogTgwz68bEu4z6qpg_L9RcBzps";
    
    let endpoint = SUPABASE_URL.trim();
    if (!endpoint.startsWith("http")) endpoint = "https://" + endpoint;
    endpoint += "/rest/v1/gcs?select=*&order=id.asc"; // Garante ordenamento crescente por ID

    const res = await fetch(endpoint, {
      method: "GET",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json"
      }
    });

    if (!res.ok) throw new Error(`Supabase Error Status: ${res.status}`);
    const rawData = await res.json();

    const sanitizedPayload = rawData.map(item => ({
      id: item.id, nome: item.nome, dia: item.dia, horario: item.horario, 
      bairro: item.bairro, endereco: item.endereco, lider: item.lider, 
      contato: item.contato, obs: item.obs, lat: item.lat, lng: item.lng
    }));

    return {
      statusCode: 200,
      headers: { 
        'Content-Type': 'application/json',
        // ⚡ Turbo Boost: Instruimos a CDN da Netlify a guardar o resultado por 5 minutos
        // Qualquer milhão de visitas nesses 5 minutos não batem no banco de dados.
        'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=600'
      },
      body: JSON.stringify(sanitizedPayload)
    };

  } catch (error) {
    console.error("Supabase Proxy Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Erro na conexão com Supabase ou tabela vazia." })
    };
  }
};
