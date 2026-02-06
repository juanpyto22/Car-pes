// ========================================
// Sistema de Detección de Peces
// Usa Google Cloud Vision API (configurable)
// ========================================

/**
 * Analiza una imagen para detectar si contiene peces
 * Retorna: { hasFish: boolean, objects: string[], confidence: number }
 */
export const analyzeImageForFish = async (imageUrl) => {
  try {
    // Opción 1: Usar Google Cloud Vision API (requiere API key)
    if (process.env.REACT_APP_GOOGLE_VISION_API_KEY) {
      return await analyzeWithGoogleVision(imageUrl);
    }
    
    // Opción 2: Usar Clarifai API (especializado en peces)
    if (process.env.REACT_APP_CLARIFAI_PAT) {
      return await analyzeWithClarifai(imageUrl);
    }
    
    // Opción 3: Usar modelo local (más rápido, requiere ML.js)
    return await analyzeWithLocalModel(imageUrl);
    
  } catch (error) {
    console.error('Error analyzing image:', error);
    // En caso de error, permitir la publicación pero registrar
    return {
      hasFish: true, // default: asumir que es válido
      objects: [],
      confidence: 0,
      error: error.message
    };
  }
};

/**
 * Google Cloud Vision API
 */
const analyzeWithGoogleVision = async (imageUrl) => {
  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${process.env.REACT_APP_GOOGLE_VISION_API_KEY}`,
    {
      method: 'POST',
      body: JSON.stringify({
        requests: [{
          image: { source: { imageUri: imageUrl } },
          features: [
            { type: 'LABEL_DETECTION', maxResults: 20 },
            { type: 'OBJECT_LOCALIZATION' }
          ]
        }]
      })
    }
  );

  const data = await response.json();
  const labels = data.responses[0]?.labelAnnotations || [];
  const objects = data.responses[0]?.localizedObjectAnnotations || [];

  // Palabras clave para detectar peces
  const fishKeywords = [
    'fish', 'pez', 'pescado', 'salmon', 'trout', 'bass', 'tilapia',
    'catfish', 'pike', 'perch', 'carp', 'bream', 'char', 'mullet',
    'barramundi', 'grouper', 'snapper', 'tuna', 'marlin'
  ];

  // Buscar peces en labels
  const detectedLabels = labels
    .map(l => l.description.toLowerCase())
    .filter(desc => 
      fishKeywords.some(keyword => desc.includes(keyword)) ||
      desc.includes('fish') || desc.includes('acuático')
    );

  // Buscar peces en objetos localizados
  const detectedObjects = objects
    .map(o => o.name.toLowerCase())
    .filter(name => 
      fishKeywords.some(keyword => name.includes(keyword))
    );

  const allDetected = [...detectedLabels, ...detectedObjects];
  const hasFish = allDetected.length > 0;
  const confidence = labels.length > 0 ? labels[0]?.score || 0 : 0;

  return {
    hasFish,
    objects: allDetected,
    confidence,
    allLabels: labels.map(l => l.description)
  };
};

/**
 * Clarifai API - Especializado en reconocimiento visual
 */
const analyzeWithClarifai = async (imageUrl) => {
  const response = await fetch('https://api.clarifai.com/v2/models/aaa03c23b3724a16a56b629203edc62c/outputs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Key ${process.env.REACT_APP_CLARIFAI_PAT}`
    },
    body: JSON.stringify({
      user_app_id: {
        user_id: process.env.REACT_APP_CLARIFAI_USER_ID,
        app_id: process.env.REACT_APP_CLARIFAI_APP_ID
      },
      inputs: [{
        data: {
          image: { url: imageUrl }
        }
      }]
    })
  });

  const data = await response.json();
  const concepts = data.outputs[0]?.data?.concepts || [];

  const fishKeywords = [
    'fish', 'pez', 'pescado', 'animal marítimo', 'agua dulce',
    'salmon', 'trout', 'bass', 'tilapia', 'catfish'
  ];

  const detectedObjects = concepts
    .filter(c => c.value > 0.5) // Confianza > 50%
    .map(c => c.name)
    .filter(name => 
      fishKeywords.some(keyword => name.toLowerCase().includes(keyword))
    );

  const hasFish = detectedObjects.length > 0;
  const topConcept = concepts[0];

  return {
    hasFish,
    objects: detectedObjects,
    confidence: topConcept?.value || 0,
    allConcepts: concepts.map(c => ({ name: c.name, score: c.value }))
  };
};

/**
 * Modelo local usando TensorFlow.js (más privado, sin API calls)
 * Requiere: npm install @tensorflow/tfjs @tensorflow-models/coco-ssd
 */
const analyzeWithLocalModel = async (imageUrl) => {
  try {
    // Importación dinámica para evitar bundling innecesario
    const cocoSsd = await import('@tensorflow-models/coco-ssd');
    const tf = await import('@tensorflow/tfjs');

    // Cargar imagen
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;

    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });

    // Cargar modelo
    const model = await cocoSsd.load();
    const predictions = await model.estimateObjects(img);

    // Palabras clave para peces
    const fishKeywords = [
      'fish', 'pez', 'salmon', 'trout', 'bass', 'tilapia', 'catfish',
      'pike', 'perch', 'carp', 'bream', 'char', 'mullet', 'barramundi'
    ];

    const detectedObjects = predictions
      .filter(p => p.score > 0.5) // Confianza > 50%
      .map(p => p.class)
      .filter(label => 
        fishKeywords.some(keyword => label.toLowerCase().includes(keyword))
      );

    // Cleanup
    model.dispose();
    tf.dispose();

    return {
      hasFish: detectedObjects.length > 0,
      objects: detectedObjects,
      confidence: predictions.length > 0 ? predictions[0].score : 0,
      allDetections: predictions.map(p => ({ class: p.class, score: p.score }))
    };
  } catch (error) {
    console.error('Error with local model:', error);
    throw error;
  }
};

/**
 * Función simple: Detectar si hay persona en la imagen
 * (para validar que no es solo una persona sin pez)
 */
export const detectPersonInImage = async (imageUrl) => {
  try {
    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${process.env.REACT_APP_GOOGLE_VISION_API_KEY}`,
      {
        method: 'POST',
        body: JSON.stringify({
          requests: [{
            image: { source: { imageUri: imageUrl } },
            features: [{ type: 'LABEL_DETECTION', maxResults: 20 }]
          }]
        })
      }
    );

    const data = await response.json();
    const labels = data.responses[0]?.labelAnnotations || [];

    const personKeywords = ['person', 'people', 'human', 'man', 'woman', 'gente'];
    const hasPerson = labels.some(l => 
      personKeywords.some(keyword => l.description.toLowerCase().includes(keyword))
    );

    return { hasPerson, labels: labels.map(l => l.description) };
  } catch (error) {
    console.error('Error detecting person:', error);
    return { hasPerson: false, labels: [] };
  }
};
