import { useState } from 'react';
import { useThemeSystemStore } from '../../lib/themeSystemStore';
import type { CustomGradient, GradientStop } from '../../lib/themeSystemStore';

interface GradientPickerProps {
  onGradientSelect?: (gradientId: string | null) => void;
  className?: string;
}

const PRESET_GRADIENTS = [
  { id: 'sunset', name: 'Sunset', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { id: 'ocean', name: 'Ocean', gradient: 'linear-gradient(135deg, #667eea 0%, #4c9aff 100%)' },
  { id: 'forest', name: 'Forest', gradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' },
  { id: 'fire', name: 'Fire', gradient: 'linear-gradient(135deg, #ff6b6b 0%, #ffd93d 100%)' },
  { id: 'arctic', name: 'Arctic', gradient: 'linear-gradient(135deg, #667eea 0%, #64b5f6 100%)' },
  { id: 'cosmic', name: 'Cosmic', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { id: 'neon', name: 'Neon', gradient: 'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)' },
  { id: 'magma', name: 'Magma', gradient: 'linear-gradient(135deg, #ff6b6b 0%, #ffd93d 100%)' },
  { id: 'aurora', name: 'Aurora', gradient: 'linear-gradient(135deg, #00d2ff 0%, #3a47d5 100%)' },
  { id: 'peach', name: 'Peach', gradient: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)' },
  { id: 'midnight', name: 'Midnight', gradient: 'linear-gradient(135deg, #2c3e50 0%, #3498db 100%)' },
  { id: 'lavender', name: 'Lavender', gradient: 'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)' },
  { id: 'emerald', name: 'Emerald', gradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' },
  { id: 'rose', name: 'Rose', gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  { id: 'sky', name: 'Sky', gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
  { id: 'sunset2', name: 'Sunset 2', gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' },
];

export function GradientPicker({ onGradientSelect, className = '' }: GradientPickerProps) {
  const { selectedGradient, setSelectedGradient, customGradients, addCustomGradient } = useThemeSystemStore();
  const [showCustomEditor, setShowCustomEditor] = useState(false);
  const [customGradient, setCustomGradient] = useState<CustomGradient>({
    id: '',
    name: '',
    angle: 135,
    stops: [
      { color: '#667eea', position: 0 },
      { color: '#764ba2', position: 100 }
    ]
  });

  const handlePresetSelect = (gradientId: string) => {
    setSelectedGradient(gradientId);
    onGradientSelect?.(gradientId);
  };

  const handleCustomSelect = (gradientId: string) => {
    setSelectedGradient(gradientId);
    onGradientSelect?.(gradientId);
  };

  const addColorStop = () => {
    const newStop: GradientStop = {
      color: '#ffffff',
      position: 50
    };
    setCustomGradient(prev => ({
      ...prev,
      stops: [...prev.stops, newStop].sort((a, b) => a.position - b.position)
    }));
  };

  const removeColorStop = (index: number) => {
    if (customGradient.stops.length > 2) {
      setCustomGradient(prev => ({
        ...prev,
        stops: prev.stops.filter((_, i) => i !== index)
      }));
    }
  };

  const updateColorStop = (index: number, field: keyof GradientStop, value: string | number) => {
    setCustomGradient(prev => ({
      ...prev,
      stops: prev.stops.map((stop, i) => 
        i === index ? { ...stop, [field]: value } : stop
      ).sort((a, b) => a.position - b.position)
    }));
  };

  const saveCustomGradient = () => {
    if (customGradient.name && customGradient.stops.length >= 2) {
      const newGradient: CustomGradient = {
        ...customGradient,
        id: `custom-${Date.now()}`
      };
      addCustomGradient(newGradient);
      handleCustomSelect(newGradient.id);
      setShowCustomEditor(false);
      
      // Reset form
      setCustomGradient({
        id: '',
        name: '',
        angle: 135,
        stops: [
          { color: '#667eea', position: 0 },
          { color: '#764ba2', position: 100 }
        ]
      });
    }
  };

  const generateGradientCSS = (gradient: CustomGradient) => {
    const stops = gradient.stops
      .sort((a, b) => a.position - b.position)
      .map(stop => `${stop.color} ${stop.position}%`)
      .join(', ');
    return `linear-gradient(${gradient.angle}deg, ${stops})`;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Preset Gradients */}
      <div>
        <h3 className="text-sm font-medium mb-3">Preset Gradients</h3>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {PRESET_GRADIENTS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handlePresetSelect(preset.id)}
              className={`relative w-full aspect-square rounded-lg border-2 transition-all hover:scale-105 ${
                selectedGradient === preset.id
                  ? 'border-primary shadow-lg'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              style={{ background: preset.gradient }}
              title={preset.name}
            >
              {selectedGradient === preset.id && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 rounded-lg">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Gradients */}
      {customGradients.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-3">Custom Gradients</h3>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {customGradients.map((gradient) => (
              <button
                key={gradient.id}
                onClick={() => handleCustomSelect(gradient.id)}
                className={`relative w-full aspect-square rounded-lg border-2 transition-all hover:scale-105 ${
                  selectedGradient === gradient.id
                    ? 'border-primary shadow-lg'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                style={{ background: generateGradientCSS(gradient) }}
                title={gradient.name}
              >
                {selectedGradient === gradient.id && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 rounded-lg">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Custom Gradient Editor */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium">Custom Gradient</h3>
          <button
            onClick={() => setShowCustomEditor(!showCustomEditor)}
            className="text-sm text-primary hover:text-primary-dark transition-colors"
          >
            {showCustomEditor ? 'Cancel' : 'Create New'}
          </button>
        </div>

        {showCustomEditor && (
          <div className="border rounded-lg p-4 space-y-4">
            {/* Name Input */}
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                value={customGradient.name}
                onChange={(e) => setCustomGradient(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Enter gradient name"
              />
            </div>

            {/* Angle Slider */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Angle: {customGradient.angle}°
              </label>
              <input
                type="range"
                min="0"
                max="360"
                value={customGradient.angle}
                onChange={(e) => setCustomGradient(prev => ({ ...prev, angle: parseInt(e.target.value) }))}
                className="w-full"
              />
            </div>

            {/* Color Stops */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Color Stops</label>
                <button
                  onClick={addColorStop}
                  className="text-sm text-primary hover:text-primary-dark"
                >
                  + Add Stop
                </button>
              </div>
              
              <div className="space-y-2">
                {customGradient.stops.map((stop, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="color"
                      value={stop.color}
                      onChange={(e) => updateColorStop(index, 'color', e.target.value)}
                      className="w-12 h-8 border rounded"
                    />
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={stop.position}
                      onChange={(e) => updateColorStop(index, 'position', parseInt(e.target.value))}
                      className="w-16 px-2 py-1 border rounded text-sm"
                    />
                    <span className="text-sm text-gray-500">%</span>
                    {customGradient.stops.length > 2 && (
                      <button
                        onClick={() => removeColorStop(index)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div>
              <label className="block text-sm font-medium mb-2">Preview</label>
              <div
                className="w-full h-20 rounded-lg border"
                style={{ background: generateGradientCSS(customGradient) }}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={saveCustomGradient}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
              >
                Save Gradient
              </button>
              <button
                onClick={() => setShowCustomEditor(false)}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Clear Selection */}
      {selectedGradient && (
        <button
          onClick={() => {
            setSelectedGradient(null);
            onGradientSelect?.(null);
          }}
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Clear Selection
        </button>
      )}
    </div>
  );
}