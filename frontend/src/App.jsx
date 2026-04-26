import React, { useState, useCallback } from 'react';
import axios from 'axios';
import { 
  UploadCloud, 
  Image as ImageIcon, 
  Zap, 
  CheckCircle, 
  Download, 
  RefreshCw,
  Sparkles,
  XCircle,
  Eye
} from 'lucide-react';
import JSZip from 'jszip';
import ComparisonSlider from './components/ComparisonSlider';
import './App.css';

const API_URL = '/api';

function App() {
  const [files, setFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState([]);
  const [currentView, setCurrentView] = useState(null); // The result being viewed in the slider
  const [progress, setProgress] = useState(0);

  // Settings
  const [quality, setQuality] = useState(75);
  const [format, setFormat] = useState('auto');
  const [resizePreset, setResizePreset] = useState('original');
  const [customWidth, setCustomWidth] = useState('');
  const [customHeight, setCustomHeight] = useState('');

  const onFileChange = (e) => {
    const newFiles = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
    setFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const optimizeImages = async () => {
    if (files.length === 0) return;

    setIsProcessing(true);
    setResults([]);
    setProgress(0);

    const newResults = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append('file', file);
      formData.append('quality', quality);
      formData.append('format_type', format);

      if (resizePreset !== 'original') {
        let w, h;
        if (resizePreset === 'thumbnail') { w = 150; h = 150; }
        else if (resizePreset === 'instagram') { w = 1080; h = 1080; }
        else if (resizePreset === 'hd') { w = 1280; h = 720; }
        else if (resizePreset === 'fullhd') { w = 1920; h = 1080; }
        else if (resizePreset === 'custom') {
          w = customWidth;
          h = customHeight;
        }
        if (w) formData.append('width', w);
        if (h) formData.append('height', h);
      }

      try {
        const response = await axios.post(`${API_URL}/optimize`, formData);
        const data = response.data;
        
        // Create a local URL for the original image for comparison
        const originalUrl = URL.createObjectURL(file);
        const result = {
          ...data,
          original_url: originalUrl,
          original_name: file.name
        };

        newResults.push(result);
        setResults(prev => [...prev, result]);
        if (newResults.length === 1) setCurrentView(result);
        
        setProgress(((i + 1) / files.length) * 100);
      } catch (error) {
        console.error(`Error optimizing ${file.name}:`, error);
        alert(`Failed to optimize ${file.name}: ${error.response?.data?.error || error.message}`);
      }
    }

    setIsProcessing(false);
  };

  const downloadSingle = async (url, originalName, format) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      
      // Create a new blob with the correct type to be safe
      const newBlob = new Blob([blob], { type: `image/${format === 'jpg' ? 'jpeg' : format}` });
      const blobUrl = URL.createObjectURL(newBlob);
      
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = blobUrl;
      
      // Clean up the filename: remove existing extension and add new one
      const baseName = originalName.includes('.') 
        ? originalName.substring(0, originalName.lastIndexOf('.')) 
        : originalName;
      
      a.download = `${baseName}_optimized.${format}`;
      
      document.body.appendChild(a);
      a.click();
      
      // Give the browser a moment to start the download before cleanup
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
      }, 100);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download image. Please try again.');
    }
  };

  const downloadAll = async () => {
    const zip = new JSZip();
    const folder = zip.folder("optimized_images");

    for (const res of results) {
      const imgRes = await fetch(res.optimized_url);
      const blob = await imgRes.blob();
      const fileName = `${res.original_name.split('.')[0]}.${res.format}`;
      folder.file(fileName, blob);
    }

    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = "optimized_vibe.zip";
    a.click();
  };

  return (
    <div className="pb-5">
      <nav className="glass-nav sticky-top mb-5">
        <div className="container d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center">
            <Zap className="text-primary me-2" fill="currentColor" />
            <span className="fw-bold fs-4">OptiVibe</span>
          </div>
          <span className="badge bg-light text-dark border rounded-pill px-3 py-2">
            <Sparkles size={14} className="text-warning me-1" /> AI Powered
          </span>
        </div>
      </nav>

      <div className="container">
        <div className="row justify-content-center mb-5 text-center">
          <div className="col-lg-8 animate-up">
            <h1 className="display-4 gradient-text mb-3">Optimize for Web. Effortlessly.</h1>
            <p className="lead text-secondary">Premium AI compression that keeps your images sharp and your site fast.</p>
          </div>
        </div>

        <div className="row g-4">
          {/* Configuration Column */}
          <div className="col-lg-5">
            <div className="glass-card p-4 h-100">
              <h5 className="fw-bold mb-4 d-flex align-items-center">
                <UploadCloud className="me-2 text-primary" /> Upload & Configure
              </h5>

              <label className="dropzone-area d-block mb-4">
                <input type="file" multiple onChange={onFileChange} className="d-none" accept="image/*" />
                <div className="upload-icon">
                  <ImageIcon size={32} />
                </div>
                <p className="mb-1 fw-bold">Click to upload or drag and drop</p>
                <p className="text-muted small">JPG, PNG, WebP (Max 10MB)</p>
              </label>

              {files.length > 0 && (
                <div className="mb-4">
                  <h6 className="small text-uppercase fw-bold text-muted mb-3">Queue ({files.length})</h6>
                  <div className="file-list" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {files.map((file, idx) => (
                      <div key={idx} className="d-flex align-items-center p-2 border rounded-3 mb-2 bg-white small">
                        <div className="flex-grow-1 text-truncate pe-3">{file.name}</div>
                        <XCircle size={16} className="text-danger cursor-pointer" onClick={() => removeFile(idx)} style={{ cursor: 'pointer' }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="config-section p-3 rounded-4 bg-white border">
                <div className="mb-4">
                  <label className="form-label d-flex justify-content-between small fw-bold">
                    <span>Quality</span>
                    <span className="text-primary">{quality}%</span>
                  </label>
                  <input type="range" className="form-range" value={quality} onChange={(e) => setQuality(e.target.value)} />
                </div>

                <div className="mb-4">
                  <label className="form-label small fw-bold">Resize Preset</label>
                  <select className="form-select glass-input shadow-none" value={resizePreset} onChange={(e) => setResizePreset(e.target.value)}>
                    <option value="original">Keep Original Size</option>
                    <option value="thumbnail">Thumbnail (150x150)</option>
                    <option value="instagram">Instagram (1080x1080)</option>
                    <option value="hd">HD (720p)</option>
                    <option value="fullhd">Full HD (1080p)</option>
                    <option value="custom">Custom Dimensions</option>
                  </select>
                </div>

                {resizePreset === 'custom' && (
                  <div className="row g-2 mb-4">
                    <div className="col-6">
                      <input type="number" className="form-control glass-input" placeholder="Width" value={customWidth} onChange={(e) => setCustomWidth(e.target.value)} />
                    </div>
                    <div className="col-6">
                      <input type="number" className="form-control glass-input" placeholder="Height" value={customHeight} onChange={(e) => setCustomHeight(e.target.value)} />
                    </div>
                  </div>
                )}

                <div className="mb-4">
                  <label className="form-label small fw-bold">Output Format</label>
                  <div className="d-flex gap-2">
                    {['auto', 'webp', 'avif', 'jpg'].map(fmt => (
                      <button 
                        key={fmt} 
                        className={`btn btn-sm rounded-pill px-3 flex-grow-1 ${format === fmt ? 'btn-primary' : 'btn-outline-secondary'}`}
                        onClick={() => setFormat(fmt)}
                      >
                        {fmt.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <button 
                  className="btn btn-primary w-100 py-3 fw-bold rounded-3 shadow-sm d-flex align-items-center justify-content-center"
                  disabled={files.length === 0 || isProcessing}
                  onClick={optimizeImages}
                >
                  {isProcessing ? (
                    <><RefreshCw size={18} className="me-2 animate-spin" /> Processing...</>
                  ) : (
                    <><Zap size={18} className="me-2" /> Optimize Now</>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Results Column */}
          <div className="col-lg-7">
            {isProcessing ? (
              <div className="glass-card p-5 text-center h-100 d-flex flex-column align-items-center justify-content-center overflow-hidden position-relative">
                <div className="scanner-container mb-5">
                  <div className="scanner-image-placeholder">
                    <ImageIcon size={64} className="text-primary-light opacity-25" />
                  </div>
                  <div className="scanner-line"></div>
                  <div className="scanner-glow"></div>
                </div>
                
                <h3 className="fw-bold gradient-text mb-2">Enhancing Your Pixels</h3>
                <p className="text-secondary mb-4">Our AI is analyzing and optimizing for maximum performance...</p>
                
                <div className="w-75">
                  <div className="d-flex justify-content-between mb-2 small fw-bold">
                    <span>Processing Queue</span>
                    <span className="text-primary">{Math.round(progress)}%</span>
                  </div>
                  <div className="progress rounded-pill shadow-sm" style={{ height: '12px', background: 'rgba(13, 110, 253, 0.1)' }}>
                    <div 
                      className="progress-bar progress-bar-animated gradient-bg" 
                      style={{ width: `${progress}%`, transition: 'width 0.4s ease' }}
                    ></div>
                  </div>
                </div>

                {/* Decorative background circles */}
                <div className="decor-circle circle-1"></div>
                <div className="decor-circle circle-2"></div>
              </div>
            ) : results.length > 0 ? (
              <div className="glass-card p-4 animate-up">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h5 className="fw-bold mb-0 d-flex align-items-center">
                    <CheckCircle className="text-success me-2" /> 
                    {currentView?.is_mock ? 'Preview Mode (No Credentials)' : 'Ready to Download'}
                  </h5>
                  <div className="d-flex gap-2">
                    {currentView?.is_mock && (
                      <span className="badge bg-warning text-dark border border-warning-subtle d-flex align-items-center">
                        <Zap size={12} className="me-1" /> Mock Data
                      </span>
                    )}
                    <button className="btn btn-dark btn-sm rounded-pill px-3" onClick={downloadAll}>
                      <Download size={14} className="me-1" /> Download ZIP
                    </button>
                  </div>
                </div>

                {currentView && <ComparisonSlider before={currentView.original_url} after={currentView.optimized_url} />}

                <div className="row g-3 my-4">
                  {[
                    { label: 'Savings', value: `-${currentView?.compression_ratio}%`, color: 'text-success' },
                    { label: 'New Size', value: formatBytes(currentView?.optimized_size) },
                    { label: 'Format', value: currentView?.format?.toUpperCase() },
                    { label: 'Resolution', value: `${currentView?.width}x${currentView?.height}` }
                  ].map((stat, i) => (
                    <div key={i} className="col-md-3 col-6">
                      <div className="bg-white border rounded-3 p-2 text-center">
                        <div className="small text-muted mb-1">{stat.label}</div>
                        <div className={`fw-bold ${stat.color || ''}`}>{stat.value}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="results-list" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {results.map((res, i) => (
                    <div key={i} className="d-flex align-items-center justify-content-between p-3 border-bottom">
                      <div className="d-flex align-items-center flex-grow-1 text-truncate">
                        <img src={res.optimized_url} className="rounded me-3" style={{ width: '40px', height: '40px', objectFit: 'cover' }} />
                        <div className="text-truncate">
                          <div className="small fw-bold text-truncate">{res.original_name}</div>
                          <div className="small text-muted">-{res.compression_ratio}% savings</div>
                        </div>
                      </div>
                      <div className="d-flex gap-2">
                        <button className="btn btn-light btn-sm" onClick={() => setCurrentView(res)} title="Preview">
                          <Eye size={16} />
                        </button>
                        <button 
                          className="btn btn-primary btn-sm" 
                          onClick={() => downloadSingle(res.optimized_url, res.original_name, res.format)}
                          title="Download"
                        >
                          <Download size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="glass-card p-5 text-center h-100 d-flex flex-column align-items-center justify-content-center border-dashed">
                <ImageIcon size={64} className="text-light mb-4" style={{ color: '#dee2e6' }} />
                <h4 className="fw-bold">No Preview Available</h4>
                <p className="text-secondary">Your optimized images will appear here.</p>
              </div>
            )}
          </div>
        </div>
      </div>
      <footer className="mt-auto py-4 border-top">
        <div className="container text-center">
          <p className="text-secondary small mb-0">
            &copy; {new Date().getFullYear()} OptiVibe. All rights reserved.
          </p>
          <p className="fw-bold mt-1" style={{ fontSize: '0.9rem', letterSpacing: '0.5px' }}>
            <span className="text-secondary opacity-50">Made with ❤️ by</span> <span className="gradient-text">Vaibhav Wani</span>
          </p>
        </div>
      </footer>
    </div>
  );
}

function formatBytes(bytes) {
  if (!bytes) return '--';
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default App;
