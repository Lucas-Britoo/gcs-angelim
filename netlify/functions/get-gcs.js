// Arquivo Proxy Seguro rodando em Node.js (AWS Lambda via Netlify)
// Função busca GCs do Supabase e retorna JSON estruturado.

exports.handler = async (event, context) => {
  try {
    // Zero-Trust: Essa Lambda esconde as chaves do frontend, protegendo o DB.
    
    // A chave provida pela configuração do Supabase
    const SUPABASE_URL = "https://ubxrhqehclgrpyzenuum.supabase.co";
    const SUPABASE_KEY = "sb_secret__iSvdogTgwz68bEu4z6qpg_L9RcBzps";
    
    // Prevenção caso a string fornecida não venha com o protocolo
    let endpoint = SUPABASE_URL.trim();
    if (!endpoint.startsWith("http")) {
      endpoint = "https://" + endpoint;
    }
    
    // Anexa a query para consultar todos os dados da tabela 'gcs'
    endpoint += "/rest/v1/gcs?select=*";

    // Dispara requisição HTTP Server-side para o PostgreSQL
    const res = await fetch(endpoint, {
      method: "GET",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json"
      }
    });

    if (!res.ok) {
      throw new Error(`Supabase Error Status: ${res.status}`);
    }

    const rawData = await res.json();

    // Sanitização e formatação estruturada
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sanitizedPayload)
    };

  } catch (error) {
    console.error("Supabase Proxy Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Erro interno: Falha de conexão com Supabase. Verifique se a tabela 'gcs' existe e possui os dados previstos." })
    };
  }
};
