import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const VALID_IMAGE_PREFIXES = ["data:image/jpeg", "data:image/png", "data:image/webp", "data:image/gif"];

function validateImageData(imageData: unknown): { valid: boolean; error?: string } {
  if (!imageData || typeof imageData !== "string") {
    return { valid: false, error: "No image data provided" };
  }

  // Check if it's a valid base64 image
  const isValidPrefix = VALID_IMAGE_PREFIXES.some(prefix => imageData.startsWith(prefix));
  if (!isValidPrefix) {
    return { valid: false, error: "Invalid image format. Supported formats: JPEG, PNG, WebP, GIF" };
  }

  // Check approximate size (base64 is ~4/3 larger than binary)
  const approximateSize = (imageData.length * 3) / 4;
  if (approximateSize > MAX_IMAGE_SIZE) {
    return { valid: false, error: "Image too large. Maximum size is 10MB" };
  }

  return { valid: true };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { imageData } = body;
    
    // Validate input
    const validation = validateImageData(imageData);
    if (!validation.valid) {
      console.error("Validation failed:", validation.error);
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Processing license plate extraction request");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract the license plate number from this image. Return ONLY the alphanumeric characters you see on the license plate, with no spaces or special characters. If you cannot read the license plate clearly, return 'UNABLE_TO_READ'."
              },
              {
                type: "image_url",
                image_url: {
                  url: imageData
                }
              }
            ]
          }
        ]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Service temporarily unavailable. Please try again later." }),
          { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Failed to process image" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const licensePlateNumber = data.choices?.[0]?.message?.content?.trim() || "UNABLE_TO_READ";

    console.log("Successfully extracted license plate");

    return new Response(
      JSON.stringify({ licensePlateNumber }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error in extract-license-plate function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
