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
    <div className="pb-5 d-flex flex-column min-vh-100">
      <nav className="glass-nav sticky-top mb-5">
        <div className="container px-4 d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center">
            <Zap className="text-primary me-2" fill="currentColor" size={24} />
            <span className="fw-bold fs-4" style={{ letterSpacing: '-0.5px' }}>OptiVibe</span>
          </div>
          <div className="d-none d-md-flex align-items-center gap-3">
            <span className="badge bg-primary-subtle text-primary border rounded-pill px-3 py-2 small fw-bold">
              <Sparkles size={14} className="me-1" /> AI Engine v2.0
            </span>
          </div>
        </div>
      </nav>

      <div className="container px-4">
        <div className="row justify-content-center mb-5 text-center">
          <div className="col-lg-8 animate-up">
            <div className="badge bg-primary-subtle text-primary rounded-pill px-3 py-2 mb-3 fw-bold">
              <Sparkles size={14} className="me-1" /> Next-Gen Image Optimization
            </div>
            <h1 className="display-3 fw-bold mb-3" style={{ letterSpacing: '-1.5px' }}>
              Optimize for Web. <span className="gradient-text">Effortlessly.</span>
            </h1>
            <p className="lead text-secondary mx-auto" style={{ maxWidth: '600px' }}>
              Premium AI compression that keeps your images sharp and your site lightning fast.
            </p>
          </div>
        </div>

        <div className="row g-4 mb-5">
          {/* Configuration Column */}
          <div className="col-lg-5 col-xl-4">
            <div className="glass-card p-4 h-100 border-0">
              <div className="d-flex align-items-center mb-4">
                <div className="bg-primary rounded-3 p-2 me-3 shadow-sm">
                  <UploadCloud className="text-white" size={20} />
                </div>
                <h5 className="fw-bold mb-0">Upload & Configure</h5>
              </div>

              <label className="dropzone-area d-block mb-4">
                <input type="file" multiple onChange={onFileChange} className="d-none" accept="image/*" />
                <div className="upload-icon">
                  <ImageIcon size={32} />
                </div>
                <p className="mb-1 fw-bold text-dark">Click to upload or drag</p>
                <p className="text-muted small">JPG, PNG, WebP (Max 10MB)</p>
              </label>

              {files.length > 0 && (
                <div className="mb-4">
                  <h6 className="small text-uppercase fw-bold text-muted mb-3 d-flex justify-content-between">
                    <span>Queue</span>
                    <span className="badge bg-light text-dark border">{files.length} files</span>
                  </h6>
                  <div className="file-list pe-2" style={{ maxHeight: '160px', overflowY: 'auto' }}>
                    {files.map((file, idx) => (
                      <div key={idx} className="d-flex align-items-center p-2 border rounded-3 mb-2 bg-white small shadow-sm animate-up">
                        <div className="flex-grow-1 text-truncate pe-3 fw-medium">{file.name}</div>
                        <XCircle size={16} className="text-danger cursor-pointer opacity-50" onClick={() => removeFile(idx)} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="config-section p-3 rounded-4 bg-light bg-opacity-50 border">
                <div className="mb-4">
                  <label className="form-label d-flex justify-content-between small fw-bold">
                    <span>Compression Quality</span>
                    <span className="text-primary">{quality}%</span>
                  </label>
                  <input type="range" className="form-range" value={quality} onChange={(e) => setQuality(e.target.value)} />
                </div>

                <div className="mb-4">
                  <label className="form-label small fw-bold">Resolution Preset</label>
                  <select className="form-select glass-input shadow-none border-0" value={resizePreset} onChange={(e) => setResizePreset(e.target.value)}>
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
                      <input type="number" className="form-control glass-input border-0" placeholder="Width" value={customWidth} onChange={(e) => setCustomWidth(e.target.value)} />
                    </div>
                    <div className="col-6">
                      <input type="number" className="form-control glass-input border-0" placeholder="Height" value={customHeight} onChange={(e) => setCustomHeight(e.target.value)} />
                    </div>
                  </div>
                )}

                <div className="mb-4">
                  <label className="form-label small fw-bold">Output Format</label>
                  <div className="d-flex gap-2">
                    {['auto', 'webp', 'avif', 'jpg'].map(fmt => (
                      <button 
                        key={fmt} 
                        className={`btn btn-sm rounded-pill px-3 flex-grow-1 fw-bold transition-all ${format === fmt ? 'btn-primary shadow-sm' : 'btn-outline-secondary border-0 bg-white'}`}
                        onClick={() => setFormat(fmt)}
                      >
                        {fmt.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <button 
                  className="btn btn-primary w-100 py-3 fw-bold rounded-3 shadow-lg border-0 gradient-bg"
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
          <div className="col-lg-7 col-xl-8">
            {isProcessing ? (
              <div className="glass-card p-5 text-center h-100 d-flex flex-column align-items-center justify-content-center overflow-hidden position-relative border-0">
                <div className="scanner-container mb-4">
                  <div className="scanner-line"></div>
                  <ImageIcon size={48} className="text-primary opacity-20" />
                </div>
                
                <h3 className="fw-bold mb-2">Enhancing Your Pixels</h3>
                <p className="text-secondary mb-4 small px-lg-5">Our AI is analyzing and optimizing each pixel for maximum performance and clarity...</p>
                
                <div className="w-100" style={{ maxWidth: '300px' }}>
                  <div className="d-flex justify-content-between mb-2 small fw-bold">
                    <span className="text-muted">Analyzing images...</span>
                    <span className="text-primary">{Math.round(progress)}%</span>
                  </div>
                  <div className="progress rounded-pill overflow-hidden" style={{ height: '8px', background: '#e2e8f0' }}>
                    <div 
                      className="progress-bar gradient-bg border-0" 
                      style={{ width: `${progress}%`, transition: 'width 0.4s ease' }}
                    ></div>
                  </div>
                </div>
              </div>
            ) : results.length > 0 ? (
              <div className="glass-card p-4 animate-up border-0">
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
                  <h5 className="fw-bold mb-0 d-flex align-items-center">
                    <div className="bg-success rounded-circle p-1 me-2 d-flex align-items-center justify-content-center">
                      <CheckCircle className="text-white" size={14} /> 
                    </div>
                    {currentView?.is_mock ? 'Preview Mode (Mock Data)' : 'Optimization Ready'}
                  </h5>
                  <div className="d-flex gap-2">
                    <button className="btn btn-dark btn-sm rounded-pill px-4 fw-bold shadow-sm border-0" onClick={downloadAll}>
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
                      <div className="bg-light bg-opacity-50 border border-white rounded-4 p-3 text-center shadow-sm">
                        <div className="small text-muted mb-1 fw-medium">{stat.label}</div>
                        <div className={`h6 fw-bold mb-0 ${stat.color || ''}`}>{stat.value}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="results-list pe-2" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {results.map((res, i) => (
                    <div key={i} className={`d-flex align-items-center justify-content-between p-3 rounded-4 mb-2 transition-all ${currentView === res ? 'bg-primary bg-opacity-10 border border-primary border-opacity-10' : 'bg-white border shadow-sm'}`}>
                      <div className="d-flex align-items-center flex-grow-1 text-truncate">
                        <div className="position-relative">
                          <img src={res.optimized_url} className="rounded-3 me-3" style={{ width: '48px', height: '48px', objectFit: 'cover' }} />
                          {currentView === res && <div className="position-absolute top-0 start-0 w-100 h-100 rounded-3 border border-primary border-2"></div>}
                        </div>
                        <div className="text-truncate">
                          <div className="small fw-bold text-truncate">{res.original_name}</div>
                          <div className="small text-success fw-medium">-{res.compression_ratio}% smaller</div>
                        </div>
                      </div>
                      <div className="d-flex gap-2 ms-3">
                        <button className={`btn btn-sm rounded-circle p-2 d-flex align-items-center justify-content-center ${currentView === res ? 'btn-primary' : 'btn-light'}`} onClick={() => setCurrentView(res)} title="Preview">
                          <Eye size={16} />
                        </button>
                        <button 
                          className="btn btn-light btn-sm rounded-circle p-2 d-flex align-items-center justify-content-center" 
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
              <div className="glass-card p-5 text-center h-100 d-flex flex-column align-items-center justify-content-center border-0" style={{ border: '2px dashed #e2e8f0 !important' }}>
                <div className="bg-light rounded-circle p-4 mb-4">
                  <ImageIcon size={48} className="text-muted opacity-50" />
                </div>
                <h4 className="fw-bold">No Preview Available</h4>
                <p className="text-secondary small mx-auto" style={{ maxWidth: '300px' }}>
                  Select your images and click "Optimize Now" to see the magic happen.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      <footer className="mt-auto py-5 border-top bg-white bg-opacity-50">
        <div className="container text-center">
          <div className="d-flex align-items-center justify-content-center mb-3">
            <Zap className="text-primary me-2" fill="currentColor" size={20} />
            <span className="fw-bold fs-5">OptiVibe</span>
          </div>
          <p className="text-secondary small mb-4 mx-auto" style={{ maxWidth: '500px' }}>
            The ultimate tool for high-performance image optimization. Secure, fast, and completely private.
          </p>
          <div className="py-3 px-4 rounded-pill bg-white shadow-sm d-inline-flex align-items-center border">
            <span className="text-secondary small fw-medium">Made with ❤️ by</span> 
            <span className="gradient-text ms-2 fw-bold" style={{ fontSize: '1rem' }}>Vaibhav Wani</span>
          </div>
          <p className="text-muted x-small mt-4 mb-0" style={{ fontSize: '0.7rem' }}>
            &copy; {new Date().getFullYear()} OptiVibe. Built for the modern web.
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
