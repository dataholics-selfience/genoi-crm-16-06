import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface EmailRequest {
  recipientEmail: string;
  recipientName: string;
  subject: string;
  textContent: string;
  htmlContent: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { recipientEmail, recipientName, subject, textContent, htmlContent }: EmailRequest = await req.json()

    // Validate required fields
    if (!recipientEmail || !recipientName || !subject || !textContent) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Send email via MailerSend
    const response = await fetch("https://api.mailersend.com/v1/email", {
      method: "POST",
      headers: {
        "Authorization": "Bearer mlsn.64216f7d25a14bd7a5a5ef79c45a74e59e8fec49d0de561db2b213b8c3fd900a",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: {
          email: "contact@genoi.com.br",
          name: "Agente de inovação aberta - Genie"
        },
        to: [
          {
            email: recipientEmail,
            name: recipientName
          }
        ],
        reply_to: {
          email: "contact@genoi.net",
          name: "Contato - Gen.OI"
        },
        subject: subject,
        text: textContent,
        html: htmlContent
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('MailerSend API error:', errorData)
      
      return new Response(
        JSON.stringify({ 
          error: `MailerSend API error: ${errorData.message || response.statusText}`,
          details: errorData 
        }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const result = await response.json()
    
    return new Response(
      JSON.stringify({
        success: true,
        mailersendId: result.id || result.message_id,
        data: result
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in send-email function:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})