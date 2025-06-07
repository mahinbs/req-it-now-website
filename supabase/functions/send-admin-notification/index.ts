
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: 'new_requirement' | 'new_message';
  reference_id: string;
  email_to: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, reference_id, email_to }: NotificationRequest = await req.json();

    console.log('Processing notification:', { type, reference_id, email_to });

    // Initialize Supabase client
    const supabaseUrl = "https://qyoeeottdkmqduqcnuou.supabase.co";
    const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5b2Vlb3R0ZGttcWR1cWNudW91Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMjk3OTksImV4cCI6MjA2NDkwNTc5OX0.hGdDaCMy9qGbIWp20dWEMdpWpDzMMB3uduSkfyWgbgc";
    const supabase = createClient(supabaseUrl, supabaseKey);

    let emailContent = '';
    let subject = '';

    if (type === 'new_requirement') {
      // Fetch requirement details
      const { data: requirement, error } = await supabase
        .from('requirements')
        .select(`
          *,
          profiles!inner(company_name, website_url)
        `)
        .eq('id', reference_id)
        .single();

      if (error) {
        console.error('Error fetching requirement:', error);
        throw error;
      }

      subject = `New Website Requirement: ${requirement.title}`;
      emailContent = `
        <h2>New Website Requirement Submitted</h2>
        <p><strong>Company:</strong> ${requirement.profiles.company_name}</p>
        <p><strong>Website:</strong> ${requirement.profiles.website_url}</p>
        <p><strong>Title:</strong> ${requirement.title}</p>
        <p><strong>Priority:</strong> ${requirement.priority}</p>
        <p><strong>Description:</strong></p>
        <p>${requirement.description}</p>
        <p><strong>Submitted:</strong> ${new Date(requirement.created_at).toLocaleString()}</p>
        ${requirement.has_screen_recording ? '<p><strong>Note:</strong> This requirement includes attachments.</p>' : ''}
        <p>Please log in to your admin dashboard to respond: <a href="https://your-domain.com">Admin Dashboard</a></p>
      `;
    } else if (type === 'new_message') {
      // Fetch message details
      const { data: message, error: messageError } = await supabase
        .from('messages')
        .select(`
          *,
          requirements(title, profiles!inner(company_name))
        `)
        .eq('id', reference_id)
        .single();

      if (messageError) {
        console.error('Error fetching message:', messageError);
        throw messageError;
      }

      const companyName = message.requirements?.profiles?.company_name || 'Unknown Company';
      const requirementTitle = message.requirements?.title || 'General Chat';

      subject = `New Message from ${companyName}`;
      emailContent = `
        <h2>New Message Received</h2>
        <p><strong>From:</strong> ${companyName}</p>
        <p><strong>Regarding:</strong> ${requirementTitle}</p>
        <p><strong>Message:</strong></p>
        <p>${message.content}</p>
        <p><strong>Sent:</strong> ${new Date(message.created_at).toLocaleString()}</p>
        <p>Please log in to your admin dashboard to respond: <a href="https://your-domain.com">Admin Dashboard</a></p>
      `;
    }

    // Send email
    const emailResponse = await resend.emails.send({
      from: "Website Requirements <onboarding@resend.dev>",
      to: [email_to],
      subject: subject,
      html: emailContent,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-admin-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
