import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Starting auto-completion check...')

    // Call the database function to auto-complete requirements
    const { data: result, error } = await supabaseClient.rpc('auto_complete_requirements')

    if (error) {
      console.error('Error calling auto_complete_requirements:', error)
      throw error
    }

    console.log('Auto-completion result:', result)

    // Also get pending auto-completion info for logging
    const { data: pendingInfo, error: pendingError } = await supabaseClient.rpc('get_pending_auto_completion')
    
    if (pendingError) {
      console.error('Error getting pending auto-completion info:', pendingError)
    } else {
      console.log('Pending auto-completion info:', pendingInfo)
    }

    return new Response(
      JSON.stringify({
        success: true,
        result: result,
        pending: pendingInfo,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
      }
    )

  } catch (error) {
    console.error('Error in auto-complete-requirements function:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
        status: 500,
      }
    )
  }
})