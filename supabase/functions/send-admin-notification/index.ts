
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
  type: 'new_requirement' | 'new_message' | 'admin_message_to_client' | 'client_message_to_admin';
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
    let recipientEmail = email_to;

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
      // Legacy support for existing message notifications
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
    } else if (type === 'admin_message_to_client') {
      // Admin sent message to client
      const { data: message, error: messageError } = await supabase
        .from('messages')
        .select(`
          *,
          requirements(
            title,
            user_id,
            profiles!inner(company_name, website_url)
          )
        `)
        .eq('id', reference_id)
        .single();

      if (messageError) {
        console.error('Error fetching message:', messageError);
        throw messageError;
      }

      // Get client email from auth.users - we need to use the service role for this
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(message.requirements.user_id);
      
      if (userError) {
        console.error('Error fetching user email:', userError);
        throw userError;
      }

      recipientEmail = userData.user?.email || email_to;
      const companyName = message.requirements?.profiles?.company_name || 'Your Company';
      const requirementTitle = message.requirements?.title || 'Your Requirement';

      subject = `New Message from Req-it-now Admin`;
      emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">New Message from Req-it-now Admin</h2>
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Regarding:</strong> ${requirementTitle}</p>
            <p><strong>Company:</strong> ${companyName}</p>
          </div>
          <div style="background-color: #ffffff; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h3 style="color: #374151; margin-top: 0;">Message from Admin:</h3>
            <p style="line-height: 1.6; color: #4b5563;">${message.content}</p>
          </div>
          <div style="margin: 20px 0; padding: 15px; background-color: #fef3c7; border-radius: 8px;">
            <p style="margin: 0; color: #92400e;">
              <strong>📬 Reply to this message:</strong> 
              <a href="https://your-domain.com" style="color: #2563eb; text-decoration: none;">Open Chat</a>
            </p>
          </div>
          <p style="color: #6b7280; font-size: 14px;">
            <strong>Sent:</strong> ${new Date(message.created_at).toLocaleString()}
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="color: #9ca3af; font-size: 12px; text-align: center;">
            This message was sent by Req-it-now Admin regarding your website requirements.
          </p>
        </div>
      `;
    } else if (type === 'client_message_to_admin') {
      // Client sent message to admin
      const { data: message, error: messageError } = await supabase
        .from('messages')
        .select(`
          *,
          requirements(
            title,
            user_id,
            profiles!inner(company_name, website_url)
          )
        `)
        .eq('id', reference_id)
        .single();

      if (messageError) {
        console.error('Error fetching message:', messageError);
        throw messageError;
      }

      const companyName = message.requirements?.profiles?.company_name || 'Unknown Company';
      const requirementTitle = message.requirements?.title || 'General Chat';
      const websiteUrl = message.requirements?.profiles?.website_url || 'Not provided';

      subject = `New Message from ${companyName} - Req-it-now`;
      emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">New Client Message - Req-it-now</h2>
          <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
            <h3 style="color: #991b1b; margin-top: 0;">Client Details:</h3>
            <p><strong>Company:</strong> ${companyName}</p>
            <p><strong>Website:</strong> ${websiteUrl}</p>
            <p><strong>Requirement:</strong> ${requirementTitle}</p>
          </div>
          <div style="background-color: #ffffff; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
            <h3 style="color: #374151; margin-top: 0;">Client Message:</h3>
            <p style="line-height: 1.6; color: #4b5563; background-color: #f9fafb; padding: 15px; border-radius: 6px;">${message.content}</p>
          </div>
          <div style="margin: 20px 0; padding: 15px; background-color: #dbeafe; border-radius: 8px;">
            <p style="margin: 0; color: #1d4ed8;">
              <strong>🚀 Respond now:</strong> 
              <a href="https://your-domain.com" style="color: #2563eb; text-decoration: none;">Open Admin Dashboard</a>
            </p>
          </div>
          <p style="color: #6b7280; font-size: 14px;">
            <strong>Sent:</strong> ${new Date(message.created_at).toLocaleString()}
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="color: #9ca3af; font-size: 12px; text-align: center;">
            This notification was generated automatically by Req-it-now.
          </p>
        </div>
      `;
    }

    // Send email
    const emailResponse = await resend.emails.send({
      from: "Req-it-now <onboarding@resend.dev>",
      to: [recipientEmail],
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
