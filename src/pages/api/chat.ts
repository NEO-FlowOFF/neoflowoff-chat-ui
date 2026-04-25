import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    
    const azureEndpoint = import.meta.env.AZURE_ENDPOINT;
    const azureApiKey = import.meta.env.AZURE_API_KEY;

    if (!azureEndpoint || !azureApiKey) {
      return new Response(JSON.stringify({ error: 'Azure configuration missing' }), { status: 500 });
    }

    const res = await fetch(azureEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': azureApiKey
      },
      body: JSON.stringify({
        ...body,
        stream: true // Ensure streaming is enabled
      })
    });

    return new Response(res.body, {
      status: res.status,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};
