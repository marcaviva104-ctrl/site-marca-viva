import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // @ts-ignore: Deno is available in Supabase Edge Functions
        const resendApiKey = Deno.env.get('RESEND_API_KEY')
        if (!resendApiKey) {
            throw new Error("RESEND_API_KEY is not set in Edge Function secrets.")
        }

        const { orderId, customerName, customerEmail, items, total, adminEmail = 'contato@marcavivagrafica.com.br' } = await req.json()

        if (!orderId || !customerName || !customerEmail) {
            throw new Error('Missing required fields: orderId, customerName, or customerEmail')
        }

        // Build Email HTML for Customer
        const customerHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
        <div style="background: #2563eb; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
            <h2 style="color: #ffffff; margin: 0;">Olá, ${customerName}!</h2>
        </div>
        <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="font-size: 16px;">Recebemos a sua solicitação na <strong>Marca Viva Gráfica</strong>.</p>
            <div style="background: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Pedido ID:</strong> ${orderId}</p>
                <p style="margin: 5px 0;"><strong>Valor Total Previsto:</strong> ${total}</p>
            </div>
            <h3 style="color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px;">Itens Solicitados:</h3>
            <ul style="padding-left: 20px;">
            ${items.map((item: any) => `<li style="margin-bottom: 5px;"><strong>${item.qty || item.quantity}x</strong> ${item.name}</li>`).join('')}
            </ul>
            <p style="margin-top: 25px;">Nossa equipe comercial analisará os detalhes do seu pedido/orçamento e entrará em contato muito em breve pelo WhatsApp ou e-mail para dar andamento.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;"/>
            <p style="font-size: 14px; color: #6b7280; text-align: center;">
                Atenciosamente,<br><strong>Equipe Marca Viva Gráfica</strong><br>
                <a href="https://marcavivagrafica.com.br" style="color: #2563eb; text-decoration: none;">Visite nosso site</a>
            </p>
        </div>
      </div>
    `

        // Build Email HTML for Admin
        const adminHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
        <div style="background: #f59e0b; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
            <h2 style="color: #ffffff; margin: 0;">Novo Pedido Site - ${orderId}</h2>
        </div>
        <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="font-size: 16px;">Um novo pedido/orçamento foi recebido pelo e-commerce.</p>
            <div style="background: #fef3c7; padding: 15px; border-radius: 5px; margin: 20px 0; border: 1px solid #fde68a;">
                <p style="margin: 5px 0;"><strong>Cliente:</strong> ${customerName}</p>
                <p style="margin: 5px 0;"><strong>E-mail:</strong> ${customerEmail}</p>
                <p style="margin: 5px 0;"><strong>Valor:</strong> ${total}</p>
            </div>
            <h3 style="color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px;">Itens do Pedido:</h3>
            <ul style="padding-left: 20px;">
            ${items.map((item: any) => `<li style="margin-bottom: 5px;"><strong>${item.qty || item.quantity}x</strong> ${item.name}</li>`).join('')}
            </ul>
            <div style="text-align: center; margin-top: 30px;">
                <a href="https://marcavivagrafica.com.br/admin" style="background: #2563eb; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Acessar Painel Admin</a>
            </div>
        </div>
      </div>
    `

        console.log("Sending emails via Resend...")

        // In Resend, if domain is not verified, use onboarding@resend.dev
        const FROM_EMAIL = 'onboarding@resend.dev'

        // 1. Send to Admin
        const resAdmin = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${resendApiKey}`
            },
            body: JSON.stringify({
                from: FROM_EMAIL,
                to: [adminEmail],
                subject: `NOVO PEDIDO SITE: ${orderId} - ${customerName}`,
                html: adminHtml
            })
        })

        // 2. Send to Customer
        const resCustomer = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${resendApiKey}`
            },
            body: JSON.stringify({
                from: FROM_EMAIL,
                to: [customerEmail],
                subject: `Recebemos sua solicitação - Marca Viva (${orderId})`,
                html: customerHtml
            })
        })

        const customerDelivery = await resCustomer.json()
        const adminDelivery = await resAdmin.json()

        console.log("Resend API response:", { customerDelivery, adminDelivery })

        return new Response(
            JSON.stringify({ success: true, customerDelivery, adminDelivery }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            },
        )
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error("Erro na Edge Function:", errorMsg)
        return new Response(
            JSON.stringify({ error: errorMsg }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            },
        )
    }
})
