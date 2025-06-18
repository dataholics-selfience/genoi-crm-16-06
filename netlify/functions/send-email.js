const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  // Handle CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { recipientEmail, recipientName, subject, textContent, htmlContent } = JSON.parse(event.body);

    // Validate required fields
    if (!recipientEmail || !recipientName || !subject || !textContent) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields' }),
      };
    }

    // Send email via MailerSend
    const response = await fetch('https://api.mailersend.com/v1/email', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer mlsn.64216f7d25a14bd7a5a5ef79c45a74e59e8fec49d0de561db2b213b8c3fd900a',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: {
          email: 'contact@genoi.com.br',
          name: 'Agente de inovação aberta - Genie',
        },
        to: [
          {
            email: recipientEmail,
            name: recipientName,
          },
        ],
        reply_to: {
          email: 'contact@genoi.net',
          name: 'Contato - Gen.OI',
        },
        subject: subject,
        text: textContent,
        html: htmlContent,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('MailerSend API error:', errorData);
      
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ 
          error: `MailerSend API error: ${errorData.message || response.statusText}`,
          details: errorData 
        }),
      };
    }

    const result = await response.json();
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        mailersendId: result.id || result.message_id,
        data: result,
      }),
    };

  } catch (error) {
    console.error('Error in send-email function:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message || 'Unknown error'
      }),
    };
  }
};