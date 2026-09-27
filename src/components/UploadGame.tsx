import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, Link as LinkIcon, Check, AlertCircle, Sparkles, Server, HardDrive, Gamepad2 } from 'lucide-react';
import { ConsoleId, GameItem } from '../types';
import { CONSOLES } from '../utils/constants';
import { retroDb } from '../utils/db';
import { getRetroGameCover } from '../utils/gameArt';
import { soundFx } from '../utils/audio';

interface UploadGameProps {
  onGameAdded: (game: GameItem) => void;
  onCancel: () => void;
}

export const UploadGame: React.FC<UploadGameProps> = ({ onGameAdded, onCancel }) => {
  const [activeTab, setActiveTab] = useState<'backend' | 'file' | 'testroms'>('backend');
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [romUrl, setRomUrl] = useState('');
  const [detectedConsole, setDetectedConsole] = useState<ConsoleId>('nes');
  const [gameTitle, setGameTitle] = useState('');
  const [gameGenre, setGameGenre] = useState('Action');
  const [gameYear, setGameYear] = useState<number>(1990);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [serverTestRoms, setServerTestRoms] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Fetch backend test ROMs on load
  useEffect(() => {
    fetch('/api/test-roms')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.games) {
          setServerTestRoms(data.games);
        }
      })
      .catch(() => {});
  }, []);

  // Auto detect console from file extension
  const detectConsole = (filename: string): ConsoleId => {
    const ext = '.' + filename.split('.').pop()?.toLowerCase();
    for (const [cId, meta] of Object.entries(CONSOLES)) {
      if (meta.extensions.includes(ext)) {
        return cId as ConsoleId;
      }
    }
    return 'nes';
  };

  const handleFileSelect = (file: File) => {
    soundFx.playClick();
    setSelectedFile(file);
    setErrorMsg(null);
    setSuccessMsg(null);

    const rawName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    const cleanTitle = rawName.replace(/[\-_]/g, ' ').replace(/\(.*\)|\[.*\]/g, '').trim();
    setGameTitle(cleanTitle || 'Custom Game');

    const consoleDetected = detectConsole(file.name);
    setDetectedConsole(consoleDetected);
    setGameYear(CONSOLES[consoleDetected].year);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  // Upload to Backend Server API (/api/upload-rom)
  const handleServerUpload = async () => {
    if (!selectedFile) {
      setErrorMsg('Please choose a ROM file first.');
      return;
    }
    if (!gameTitle.trim()) {
      setErrorMsg('Please specify a game title.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);
    setProgress(20);

    try {
      const formData = new FormData();
      formData.append('romFile', selectedFile);
      formData.append('title', gameTitle.trim());
      formData.append('consoleId', detectedConsole);
      formData.append('genre', gameGenre);
      formData.append('year', String(gameYear));

      setProgress(50);
      const res = await fetch('/api/upload-rom', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Server responded with ${res.status}`);
      }

      setProgress(90);
      const data = await res.json();
      setProgress(100);

      const cover = getRetroGameCover(detectedConsole, gameTitle, gameGenre);
      const newGame: GameItem = {
        id: data.game.id,
        title: data.game.title,
        consoleId: data.game.consoleId,
        year: data.game.year,
        genre: data.game.genre,
        coverUrl: cover,
        description: data.game.description,
        favorite: false,
        playTimeMinutes: 0,
        saveStatesCount: 0,
        romUrl: data.game.romUrl,
        isDemo: false,
      };

      // Also persist metadata to client DB for library persistence
      await retroDb.saveGameMetadata(newGame);

      soundFx.playPowerUp();
      setSuccessMsg(`ROM verified on backend: ${data.game.romUrl}`);
      setTimeout(() => {
        onGameAdded(newGame);
      }, 700);
    } catch (err: any) {
      setErrorMsg(`Backend upload error: ${err.message}`);
      setIsProcessing(false);
    }
  };

  // Local-only IndexedDB upload
  const handleLocalUpload = async () => {
    if (!selectedFile && !romUrl.trim()) {
      setErrorMsg('Please select a file or enter a direct URL');
      return;
    }
    if (!gameTitle.trim()) {
      setErrorMsg('Please enter a game title');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);

    for (let p = 10; p <= 100; p += 30) {
      setProgress(p);
      await new Promise((r) => setTimeout(r, 60));
    }

    try {
      const newId = `custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const cover = getRetroGameCover(detectedConsole, gameTitle, gameGenre);

      let romBlob: Blob | undefined;
      if (selectedFile) {
        romBlob = selectedFile;
        await retroDb.saveRom(newId, selectedFile);
      }

      const newGame: GameItem = {
        id: newId,
        title: gameTitle.trim(),
        consoleId: detectedConsole,
        year: gameYear,
        genre: gameGenre,
        coverUrl: cover,
        description: `Client IndexedDB ROM: ${selectedFile?.name || romUrl}`,
        favorite: false,
        playTimeMinutes: 0,
        saveStatesCount: 0,
        romBlob,
        romUrl: romUrl.trim() || undefined,
        isDemo: false,
      };

      await retroDb.saveGameMetadata(newGame);
      soundFx.playPowerUp();
      onGameAdded(newGame);
    } catch (err: any) {
      setErrorMsg('Failed to store locally: ' + (err.message || 'Unknown error'));
      setIsProcessing(false);
    }
  };

  // Quick load backend test ROM into library
  const handleAddTestRom = async (testRom: any) => {
    soundFx.playCoin();
    const cover = getRetroGameCover(testRom.consoleId, testRom.title, testRom.genre);
    const newGame: GameItem = {
      ...testRom,
      coverUrl: cover,
    };
    await retroDb.saveGameMetadata(newGame);
    onGameAdded(newGame);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-[#0e0c1f] border border-purple-900/40 rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
        {/* Title */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-3 rounded-full bg-cyan-950/60 border border-cyan-800/40 text-xs font-mono text-cyan-300">
            <span className="w-1.5 h-1.5 rounded-full bg-[#a3e635] shadow-[0_0_8px_#a3e635] animate-pulse" />
            <span>Backend Express API Online</span>
            <span className="text-zinc-600">·</span>
            <span>Multipart Form Upload & Real Storage</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-retro text-white">
            ROM VAULT & SERVER UPLOAD
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 font-sans mt-2 max-w-md mx-auto">
            Upload custom ROM files directly to the Node.js backend server or test with bundled real hardware ROM images.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center justify-center mb-6">
          <div className="inline-flex p-1 bg-zinc-900/90 rounded-xl border border-zinc-800 gap-1">
            <button
              onClick={() => {
                soundFx.playClick();
                setActiveTab('backend');
              }}
              className={`px-3 py-2 text-xs font-mono rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'backend'
                  ? 'bg-[#a855f7] text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Server className="w-3.5 h-3.5" />
              <span>Backend Upload (/api)</span>
            </button>

            <button
              onClick={() => {
                soundFx.playClick();
                setActiveTab('testroms');
              }}
              className={`px-3 py-2 text-xs font-mono rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'testroms'
                  ? 'bg-[#06b6d4] text-black font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Gamepad2 className="w-3.5 h-3.5" />
              <span>Real Test ROMs ({serverTestRoms.length})</span>
            </button>

            <button
              onClick={() => {
                soundFx.playClick();
                setActiveTab('file');
              }}
              className={`px-3 py-2 text-xs font-mono rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'file'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>Local Offline</span>
            </button>
          </div>
        </div>

        {/* Real Test ROMs Tab */}
        {activeTab === 'testroms' && (
          <div className="space-y-3 mb-6">
            <p className="text-xs text-zinc-300 font-sans">
              Instant hardware tests served directly from the backend server with valid headers:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {serverTestRoms.map((testRom) => {
                const cMeta = CONSOLES[testRom.consoleId as ConsoleId];
                return (
                  <div
                    key={testRom.id}
                    className="p-4 bg-zinc-900/60 border border-zinc-800 hover:border-[#06b6d4] rounded-2xl flex flex-col justify-between transition-colors"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-retro text-[#06b6d4]">{cMeta.shortName}</span>
                        <span className="text-[10px] font-mono text-zinc-500">{testRom.year}</span>
                      </div>
                      <h4 className="text-sm font-semibold text-white">{testRom.title}</h4>
                      <p className="text-[11px] text-zinc-400 font-sans mt-1 line-clamp-2">{testRom.description}</p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between">
                      <span className="text-[10px] font-mono text-zinc-500">{testRom.romUrl}</span>
                      <button
                        onClick={() => handleAddTestRom(testRom)}
                        className="px-3 py-1.5 bg-[#06b6d4] hover:bg-[#0891b2] text-black font-retro text-[10px] rounded-lg transition-colors cursor-pointer"
                      >
                        LOAD & PLAY
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Drag & Drop Area for File / Backend */}
        {(activeTab === 'backend' || activeTab === 'file') && (
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 relative ${
              dragActive
                ? 'border-[#a855f7] bg-purple-950/30 scale-[1.01] shadow-[0_0_25px_rgba(168,85,247,0.3)]'
                : selectedFile
                ? 'border-[#a3e635]/60 bg-[#a3e635]/5'
                : 'border-zinc-800 hover:border-purple-800/80 bg-zinc-900/40'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelect(e.target.files[0]);
                }
              }}
              className="hidden"
              accept=".nes,.snes,.smc,.sfc,.gb,.gbc,.gba,.md,.bin,.gen,.z64,.n64,.v64,.iso,.cue,.chd,.zip"
            />

            {selectedFile ? (
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-[#a3e635]/20 flex items-center justify-center text-[#a3e635] mb-3">
                  <Check className="w-6 h-6" />
                </div>
                <span className="text-sm font-semibold text-white">{selectedFile.name}</span>
                <span className="text-xs text-zinc-400 font-mono mt-1">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB · Ready for {activeTab === 'backend' ? 'Server API' : 'IndexedDB'}
                </span>
                <span className="text-[11px] text-[#a855f7] mt-3 hover:underline">
                  Click to replace file
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-purple-950/60 flex items-center justify-center text-[#a855f7] mb-3 border border-purple-800/40">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <span className="text-sm font-semibold text-zinc-200">
                  Drag & drop your ROM file here, or click to browse
                </span>
                <span className="text-xs text-zinc-500 font-mono mt-2">
                  Supports .nes, .smc, .sfc, .gb, .gbc, .gba, .md, .z64, .chd
                </span>
              </div>
            )}
          </div>
        )}

        {/* Metadata Editor Form */}
        {(activeTab === 'backend' || activeTab === 'file') && (
          <div className="mt-6 pt-6 border-t border-purple-950/60 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-mono text-zinc-400 block mb-1">Game Title</label>
              <input
                type="text"
                value={gameTitle}
                onChange={(e) => setGameTitle(e.target.value)}
                placeholder="e.g. Super Metroid"
                className="w-full px-3 py-2 bg-zinc-900/90 border border-zinc-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-[#a855f7]"
              />
            </div>

            <div>
              <label className="text-xs font-mono text-zinc-400 block mb-1">Hardware System</label>
              <select
                value={detectedConsole}
                onChange={(e) => {
                  soundFx.playClick();
                  setDetectedConsole(e.target.value as ConsoleId);
                }}
                className="w-full px-3 py-2 bg-zinc-900/90 border border-zinc-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-[#a855f7]"
              >
                {Object.values(CONSOLES).map((c) => (
                  <option key={c.id} value={c.id} className="bg-zinc-900">
                    {c.name} ({c.shortName})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-mono text-zinc-400 block mb-1">Genre</label>
              <input
                type="text"
                value={gameGenre}
                onChange={(e) => setGameGenre(e.target.value)}
                placeholder="Action, RPG, Platformer..."
                className="w-full px-3 py-2 bg-zinc-900/90 border border-zinc-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-[#a855f7]"
              />
            </div>

            <div>
              <label className="text-xs font-mono text-zinc-400 block mb-1">Release Year</label>
              <input
                type="number"
                value={gameYear}
                onChange={(e) => setGameYear(parseInt(e.target.value) || 1990)}
                className="w-full px-3 py-2 bg-zinc-900/90 border border-zinc-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-[#a855f7]"
              />
            </div>
          </div>
        )}

        {/* Progress Bar */}
        {isProcessing && (
          <div className="mt-6 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
              <span>{activeTab === 'backend' ? 'Sending multipart payload to server...' : 'Writing blocks to IndexedDB...'}</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
              <div
                className="h-full bg-gradient-to-r from-[#06b6d4] via-[#a855f7] to-[#ec4899] transition-all duration-150"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Success / Error Message */}
        {successMsg && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Actions */}
        {(activeTab === 'backend' || activeTab === 'file') && (
          <div className="mt-8 flex items-center justify-end gap-3">
            <button
              onClick={() => {
                soundFx.playClick();
                onCancel();
              }}
              disabled={isProcessing}
              className="px-4 py-2 text-xs font-mono text-zinc-400 hover:text-white bg-zinc-900/60 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={activeTab === 'backend' ? handleServerUpload : handleLocalUpload}
              disabled={isProcessing || !selectedFile}
              className="px-6 py-2.5 text-xs font-retro text-white bg-gradient-to-r from-[#a855f7] to-[#ec4899] hover:from-[#9333ea] hover:to-[#db2777] rounded-xl shadow-[0_0_15px_rgba(168,85,247,0.4)] disabled:opacity-50 disabled:pointer-events-none transition-all active:scale-95 cursor-pointer"
            >
              {isProcessing ? 'UPLOADING...' : activeTab === 'backend' ? 'UPLOAD TO SERVER' : 'SAVE OFFLINE'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
