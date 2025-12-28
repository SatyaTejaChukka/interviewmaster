import React, { useState } from 'react';
import { generateTopicBadge } from '../services/gemini';
import { AspectRatio, ImageSize } from '../types';
import { Sparkles, Image as ImageIcon, Download } from 'lucide-react';

const ImageGenerator: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio['1:1']);
  const [size, setSize] = useState<ImageSize>(ImageSize['1K']);
  const [loading, setLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!prompt) return;
    setLoading(true);
    setError('');
    setGeneratedImage(null);

    try {
      // Prepend context to ensure it makes a badge/icon style if desired, or let user control freely
      const result = await generateTopicBadge(prompt, aspectRatio, size);
      if (result) {
        setGeneratedImage(result);
      } else {
        setError('Failed to generate image. Please try again.');
      }
    } catch (err) {
      setError('An error occurred during generation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-6">
        <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
          <Sparkles size={20} />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Achievement Badge Generator</h2>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Badge Concept Prompt</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., A golden trophy with a Python logo for mastering algorithms"
            className="w-full px-4 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none h-24 resize-none"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Aspect Ratio</label>
            <select
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
              className="w-full px-4 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
            >
              {Object.values(AspectRatio).map((ratio) => (
                <option key={ratio} value={ratio}>{ratio}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Resolution</label>
            <select
              value={size}
              onChange={(e) => setSize(e.target.value as ImageSize)}
              className="w-full px-4 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
            >
              {Object.values(ImageSize).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading || !prompt}
          className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Generatng...
            </>
          ) : (
            <>
              <ImageIcon size={20} />
              Generate Badge
            </>
          )}
        </button>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        {generatedImage && (
          <div className="mt-6 space-y-3">
            <div className="relative group rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
               <img src={generatedImage} alt="Generated result" className="w-full h-auto object-contain max-h-96" />
            </div>
            <a 
              href={generatedImage} 
              download={`badge-${Date.now()}.png`}
              className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium"
            >
              <Download size={18} />
              Download Image
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageGenerator;