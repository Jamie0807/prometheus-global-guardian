import React, { useState, useEffect } from 'react';

interface ChartCustomizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: ChartSettings) => void;
  currentSettings: ChartSettings;
}

export interface ChartSettings {
  colorScheme: 'default' | 'vibrant' | 'pastel' | 'monochrome' | 'custom';
  customColors: {
    earthquake: string;
    volcano: string;
    storm: string;
    flood: string;
    wildfire: string;
  };
  chartStyle: 'smooth' | 'sharp';
  gridLines: boolean;
  animations: boolean;
  fontSize: 'small' | 'medium' | 'large';
}

const COLOR_SCHEMES = {
  default: {
    earthquake: '#ef4444',
    volcano: '#f97316',
    storm: '#3b82f6',
    flood: '#06b6d4',
    wildfire: '#dc2626'
  },
  vibrant: {
    earthquake: '#ff0066',
    volcano: '#ff6600',
    storm: '#0066ff',
    flood: '#00ccff',
    wildfire: '#ff3333'
  },
  pastel: {
    earthquake: '#fca5a5',
    volcano: '#fdba74',
    storm: '#93c5fd',
    flood: '#67e8f9',
    wildfire: '#fca5a5'
  },
  monochrome: {
    earthquake: '#374151',
    volcano: '#4b5563',
    storm: '#6b7280',
    flood: '#9ca3af',
    wildfire: '#d1d5db'
  }
};

const ChartCustomizationModal: React.FC<ChartCustomizationModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentSettings
}) => {
  const [settings, setSettings] = useState<ChartSettings>(currentSettings);

  useEffect(() => {
    setSettings(currentSettings);
  }, [currentSettings, isOpen]);

  if (!isOpen) return null;

  const handleColorSchemeChange = (scheme: ChartSettings['colorScheme']) => {
    if (scheme !== 'custom') {
      setSettings({
        ...settings,
        colorScheme: scheme,
        customColors: COLOR_SCHEMES[scheme]
      });
    } else {
      setSettings({
        ...settings,
        colorScheme: scheme
      });
    }
  };

  const handleCustomColorChange = (hazardType: keyof ChartSettings['customColors'], color: string) => {
    setSettings({
      ...settings,
      colorScheme: 'custom',
      customColors: {
        ...settings.customColors,
        [hazardType]: color
      }
    });
  };

  const handleSave = () => {
    onSave(settings);
    onClose();
  };

  const handleReset = () => {
    setSettings({
      colorScheme: 'default',
      customColors: COLOR_SCHEMES.default,
      chartStyle: 'smooth',
      gridLines: true,
      animations: true,
      fontSize: 'medium'
    });
  };

  return (
    <div className="chart-customization-overlay" onClick={onClose}>
      <div className="chart-customization-modal" onClick={(e) => e.stopPropagation()}>
        <div className="customization-header">
          <div>
            <h3>Chart Customization</h3>
            <p className="customization-subtitle">Personalize your analytics dashboard</p>
          </div>
          <button className="customization-close-btn" onClick={onClose}>
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="customization-content">
          {/* Color Scheme Section */}
          <div className="customization-section">
            <h4>
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
              Color Scheme
            </h4>
            <div className="scheme-selector">
              {(['default', 'vibrant', 'pastel', 'monochrome', 'custom'] as const).map((scheme) => (
                <button
                  key={scheme}
                  className={`scheme-btn ${settings.colorScheme === scheme ? 'active' : ''}`}
                  onClick={() => handleColorSchemeChange(scheme)}
                >
                  <div className="scheme-preview">
                    {scheme !== 'custom' && Object.values(COLOR_SCHEMES[scheme]).map((color, i) => (
                      <div key={i} className="scheme-color" style={{ backgroundColor: color }} />
                    ))}
                    {scheme === 'custom' && Object.values(settings.customColors).map((color, i) => (
                      <div key={i} className="scheme-color" style={{ backgroundColor: color }} />
                    ))}
                  </div>
                  <span className="scheme-name">{scheme}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Colors Section */}
          {settings.colorScheme === 'custom' && (
            <div className="customization-section">
              <h4>Custom Colors</h4>
              <div className="custom-colors-grid">
                {(Object.keys(settings.customColors) as Array<keyof ChartSettings['customColors']>).map((hazardType) => (
                  <div key={hazardType} className="color-picker-item">
                    <label>{hazardType.charAt(0).toUpperCase() + hazardType.slice(1)}</label>
                    <input
                      type="color"
                      value={settings.customColors[hazardType]}
                      onChange={(e) => handleCustomColorChange(hazardType, e.target.value)}
                      className="color-picker"
                    />
                    <span className="color-value">{settings.customColors[hazardType]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chart Style Section */}
          <div className="customization-section">
            <h4>
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
              Chart Style
            </h4>
            <div className="style-options">
              <button
                className={`style-btn ${settings.chartStyle === 'smooth' ? 'active' : ''}`}
                onClick={() => setSettings({ ...settings, chartStyle: 'smooth' })}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 20 Q 6 12, 10 14 T 18 8 L 21 4" />
                </svg>
                Smooth
              </button>
              <button
                className={`style-btn ${settings.chartStyle === 'sharp' ? 'active' : ''}`}
                onClick={() => setSettings({ ...settings, chartStyle: 'sharp' })}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 20 L 8 12 L 12 14 L 16 8 L 21 4" />
                </svg>
                Sharp
              </button>
            </div>
          </div>

          {/* Display Options Section */}
          <div className="customization-section">
            <h4>
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              Display Options
            </h4>
            <div className="toggle-options">
              <label className="toggle-option">
                <span>Grid Lines</span>
                <input
                  type="checkbox"
                  checked={settings.gridLines}
                  onChange={(e) => setSettings({ ...settings, gridLines: e.target.checked })}
                  className="toggle-checkbox"
                />
              </label>
              <label className="toggle-option">
                <span>Animations</span>
                <input
                  type="checkbox"
                  checked={settings.animations}
                  onChange={(e) => setSettings({ ...settings, animations: e.target.checked })}
                  className="toggle-checkbox"
                />
              </label>
            </div>
          </div>

          {/* Font Size Section */}
          <div className="customization-section">
            <h4>
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Font Size
            </h4>
            <div className="font-size-options">
              {(['small', 'medium', 'large'] as const).map((size) => (
                <button
                  key={size}
                  className={`font-size-btn ${settings.fontSize === size ? 'active' : ''}`}
                  onClick={() => setSettings({ ...settings, fontSize: size })}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="customization-footer">
          <button className="customization-reset-btn" onClick={handleReset}>
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reset to Default
          </button>
          <div className="customization-actions">
            <button className="customization-cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button className="customization-save-btn" onClick={handleSave}>
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChartCustomizationModal;
