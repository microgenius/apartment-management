// ==========================================
// API CONFIGURATION
// ==========================================

// Gemini API Configuration - Read from environment variables
export const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
export const GEMINI_API_URL = import.meta.env.VITE_GEMINI_API_URL || "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent";

/**
 * Gemini API'ye istek gönderir
 * @param prompt - AI'ya gönderilecek prompt
 * @returns AI'dan gelen yanıt metni
 */
export const callGemini = async (prompt: string): Promise<string> => {
  try {
    const response = await fetch(
      `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          contents: [{ 
            parts: [{ text: prompt }] 
          }] 
        }),
      }
    );
    
    if (!response.ok) {
      throw new Error('API Hatası');
    }
    
    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Servis şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyiniz.";
  }
};
