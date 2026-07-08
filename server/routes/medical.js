const { Router } = require('express');
const { createClient } = require('@supabase/supabase-js');
const { genAI, fastModel } = require('../lib/gemini');

const router = Router();

const supabaseUrl = process.env.SUPABASE_URL && process.env.SUPABASE_URL.startsWith('http')
  ? process.env.SUPABASE_URL
  : 'https://placeholder.supabase.co';

const supabaseSecret = process.env.SUPABASE_SECRET_KEY || 'placeholder_secret';

const supabase = createClient(supabaseUrl, supabaseSecret);

// Vision model for analysing report images/PDFs
const visionModel = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash',
  generationConfig: {
    temperature: 0.2,
    maxOutputTokens: 4096
  }
});

/* ─────────────────────────────────────
   CATEGORIES with display info
───────────────────────────────────── */
const CATEGORIES = {
  heart: {
    label: 'Heart & Cardiac',
    icon: 'ti-heart',
    color: '#E24B4A',
    bg: '#FFF0F0'
  },
  dental: {
    label: 'Dental',
    icon: 'ti-dental',
    color: '#185FA5',
    bg: '#EBF4FF'
  },
  xray: {
    label: 'X-Ray & Scan',
    icon: 'ti-scan',
    color: '#7C3AED',
    bg: '#F3EFFE'
  },
  blood_test: {
    label: 'Blood Test',
    icon: 'ti-droplet',
    color: '#BA7517',
    bg: '#FAEEDA'
  },
  eye: {
    label: 'Eye & Vision',
    icon: 'ti-eye',
    color: '#0891B2',
    bg: '#ECFEFF'
  },
  kidney: {
    label: 'Kidney',
    icon: 'ti-flask',
    color: '#DB2777',
    bg: '#FDF2F8'
  },
  diabetes: {
    label: 'Diabetes',
    icon: 'ti-activity',
    color: '#BA7517',
    bg: '#FAEEDA'
  },
  brain: {
    label: 'Brain & Neuro',
    icon: 'ti-brain',
    color: '#7C3AED',
    bg: '#F3EFFE'
  },
  bone: {
    label: 'Bone & Joint',
    icon: 'ti-bone',
    color: '#6B7280',
    bg: '#F9FAFB'
  },
  lung: {
    label: 'Lung & Chest',
    icon: 'ti-lungs',
    color: '#059669',
    bg: '#ECFDF5'
  },
  skin: {
    label: 'Skin',
    icon: 'ti-sparkles',
    color: '#D97706',
    bg: '#FFFBEB'
  },
  general: {
    label: 'General',
    icon: 'ti-stethoscope',
    color: '#1D9E75',
    bg: '#F0FBF7'
  },
  other: {
    label: 'Other',
    icon: 'ti-file-text',
    color: '#5A7A9A',
    bg: '#EBF4FF'
  }
};

/* ─────────────────────────────────────
   GET /api/medical/categories
   Return all categories with metadata
───────────────────────────────────── */
router.get('/categories', (req, res) => {
  return res.json({ success: true, categories: CATEGORIES });
});

/* ─────────────────────────────────────
   POST /api/medical/upload
   Save a new medical record after
   file is uploaded to Cloudinary client-side
───────────────────────────────────── */
router.post('/upload', async (req, res) => {
  const {
    elder_id, name, category,
    report_date, file_url, file_type,
    file_name, file_size_kb, notes
  } = req.body;

  if (!elder_id || !name || !category ||
      !report_date || !file_url || !file_type) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields'
    });
  }

  try {
    const { data, error } = await supabase
      .from('medical_records')
      .insert({
        elder_id, name, category,
        report_date, file_url, file_type,
        file_name: file_name || name,
        file_size_kb: file_size_kb || null,
        notes: notes || null
      })
      .select()
      .single();

    if (error) throw error;

    return res.json({ success: true, record: data });

  } catch (e) {
    console.error('Upload record error:', e);
    return res.status(500).json({
      success: false,
      error: e.message
    });
  }
});

/* ─────────────────────────────────────
   GET /api/medical/list/:elderId
   Get all records, optionally filtered
───────────────────────────────────── */
router.get('/list/:elderId', async (req, res) => {
  const { elderId } = req.params;
  const { category, favourite } = req.query;

  try {
    let query = supabase
      .from('medical_records')
      .select('*')
      .eq('elder_id', elderId)
      .order('report_date', { ascending: false });

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    if (favourite === 'true') {
      query = query.eq('is_favourite', true);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Group by category for overview
    const grouped = {};
    (data || []).forEach(record => {
      if (!grouped[record.category]) {
        grouped[record.category] = [];
      }
      grouped[record.category].push(record);
    });

    return res.json({
      success: true,
      records: data || [],
      grouped,
      total: data?.length || 0
    });

  } catch (e) {
    return res.status(500).json({
      success: false,
      records: [], grouped: {}, total: 0
    });
  }
});

/* ─────────────────────────────────────
   GET /api/medical/record/:recordId
   Get single record details
───────────────────────────────────── */
router.get('/record/:recordId', async (req, res) => {
  const { recordId } = req.params;
  try {
    const { data, error } = await supabase
      .from('medical_records')
      .select('*')
      .eq('id', recordId)
      .single();

    if (error) throw error;
    return res.json({ success: true, record: data });

  } catch (e) {
    return res.status(500).json({
      success: false,
      error: e.message
    });
  }
});

/* ─────────────────────────────────────
   PUT /api/medical/update/:recordId
   Update record details
───────────────────────────────────── */
router.put('/update/:recordId', async (req, res) => {
  const { recordId } = req.params;
  const { name, category, report_date,
          notes, is_favourite } = req.body;

  try {
    const { data, error } = await supabase
      .from('medical_records')
      .update({
        name, category, report_date,
        notes, is_favourite,
        updated_at: new Date().toISOString()
      })
      .eq('id', recordId)
      .select()
      .single();

    if (error) throw error;
    return res.json({ success: true, record: data });

  } catch (e) {
    return res.status(500).json({
      success: false,
      error: e.message
    });
  }
});

/* ─────────────────────────────────────
   DELETE /api/medical/delete/:recordId
   Delete a record permanently
───────────────────────────────────── */
router.delete('/delete/:recordId', async (req, res) => {
  const { recordId } = req.params;
  try {
    const { error } = await supabase
      .from('medical_records')
      .delete()
      .eq('id', recordId);

    if (error) throw error;
    return res.json({ success: true });

  } catch (e) {
    return res.status(500).json({
      success: false,
      error: e.message
    });
  }
});

/* ─────────────────────────────────────
   POST /api/medical/analyse/:recordId
   AI analysis of a medical report
   using Gemini Vision API
───────────────────────────────────── */
router.post('/analyse/:recordId', async (req, res) => {
  const { recordId } = req.params;

  try {
    const { data: record } = await supabase
      .from('medical_records')
      .select('*')
      .eq('id', recordId)
      .single();

    if (!record) {
      return res.status(404).json({
        success: false,
        error: 'Record not found'
      });
    }

    // Get elder profile for context
    const { data: profile } = await supabase
      .from('elder_profiles')
      .select('age, conditions')
      .eq('id', record.elder_id)
      .single();

    const { data: user } = await supabase
      .from('users')
      .select('name')
      .eq('id', record.elder_id)
      .single();

    let analysisText = null;
    let doctorRec = null;

    try {
      // Fetch the actual file for vision analysis
      const fileResponse = await fetch(record.file_url);
      const fileBuffer = await fileResponse.arrayBuffer();
      const base64Data = Buffer.from(fileBuffer).toString('base64');

      const mimeType = record.file_type === 'pdf'
        ? 'application/pdf'
        : 'image/jpeg';

      const analysisPrompt = `You are a medical report analyser 
helping an elderly patient in India understand their test results.

Patient: ${user?.name || 'Patient'}, 
Age: ${profile?.age || 'elderly'}
Known conditions: ${profile?.conditions?.join(', ') || 'none'}
Report type: ${record.category} — ${record.name}
Report date: ${record.report_date}

Please analyse this medical report and explain:

1. WHAT THIS REPORT SHOWS — explain in 2-3 simple 
   sentences what the test or report is measuring.
   Use simple language an elderly person understands.

2. KEY FINDINGS — list the most important values 
   or observations from this report.
   Mark each as: Normal ✓ / Needs Attention ⚠️ / Concerning 🔴

3. WHAT THIS MEANS FOR YOU — explain what the 
   results mean for this patient's health in 
   plain, reassuring language.

IMPORTANT RULES:
- Never give dosage advice
- Never say "you have [disease]" — say "the report suggests..."
- Always end with "Please discuss these results with your doctor"
- Be warm and not alarming
- No medical jargon without explanation
- Write in simple English
- Use short paragraphs, not bullet points`;

      const result = await visionModel.generateContent([
        analysisPrompt,
        {
          inlineData: {
            mimeType,
            data: base64Data
          }
        }
      ]);

      analysisText = result.response.text().trim();

    } catch (visionErr) {
      console.error('Vision analysis failed:', visionErr);

      // Fallback: text-only analysis based on category
      const fallbackPrompt = `An elderly patient in India named 
${user?.name || 'patient'}, age ${profile?.age || 'elderly'}, 
has a ${record.category} medical report called "${record.name}" 
dated ${record.report_date}.
Known conditions: ${profile?.conditions?.join(', ') || 'none'}.

Without seeing the actual report, provide:
1. A brief explanation of what a ${record.category} report 
   like "${record.name}" typically measures (2 sentences)
2. What values a patient should ask their doctor to explain
3. General guidance to review with their doctor

Keep it simple, warm, and non-alarming.
Always recommend discussing with their doctor.
No bullet points, just flowing paragraphs.`;

      const fallbackResult = await fastModel.generateContent(fallbackPrompt);
      analysisText = fallbackResult.response.text().trim()
        + '\n\n(Note: This is general guidance as the '
        + 'report content could not be fully processed. '
        + 'Please share the actual report with your doctor.)';
    }

    // Get doctor recommendation separately
    try {
      const docPrompt = `Based on a ${record.category} medical 
report called "${record.name}" for an elderly patient in India
with these conditions: ${profile?.conditions?.join(', ') || 'none'},
recommend in 2 sentences:
1. Which type of specialist doctor they should show this to
2. How urgently (routine checkup / within 2 weeks / soon)

Be specific about the doctor type. 
Example: "Show this to a Cardiologist (heart specialist). 
This appears to be a routine checkup report that can be 
discussed at your next scheduled appointment."

No bullet points. Two sentences only.`;

      const docResult = await fastModel.generateContent(docPrompt);
      doctorRec = docResult.response.text().trim();

    } catch (docErr) {
      console.error('Doctor rec failed:', docErr);
      doctorRec = `Please show this ${record.category} report 
to your doctor at your next appointment for proper evaluation.`;
    }

    // Save analysis to database
    await supabase
      .from('medical_records')
      .update({
        ai_analysis: analysisText,
        ai_doctor_recommendation: doctorRec,
        ai_analysed_at: new Date().toISOString()
      })
      .eq('id', recordId);

    return res.json({
      success: true,
      analysis: analysisText,
      doctorRecommendation: doctorRec,
      analysedAt: new Date().toISOString()
    });

  } catch (e) {
    console.error('Analysis error:', e);

    if (e.status === 429) {
      return res.status(429).json({
        success: false,
        error: 'Sahara AI is busy. Please try analysis again in a moment.'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Could not analyse report. Please try again.'
    });
  }
});

/* ─────────────────────────────────────
   GET /api/medical/share/:recordId
   Generate a shareable view token
   (simple approach — just return the
   public Cloudinary URL)
───────────────────────────────────── */
router.get('/share/:recordId', async (req, res) => {
  const { recordId } = req.params;
  try {
    const { data: record } = await supabase
      .from('medical_records')
      .select('file_url, name, category, report_date')
      .eq('id', recordId)
      .single();

    if (!record) {
      return res.status(404).json({
        success: false,
        error: 'Record not found'
      });
    }

    return res.json({
      success: true,
      shareUrl: record.file_url,
      name: record.name,
      category: record.category,
      date: record.report_date
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      error: e.message
    });
  }
});

module.exports = router;
