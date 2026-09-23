import React, { useState } from 'react';
import { usePWAInstall } from './usePWAInstall';
import { Download, Share, PlusSquare, Smartphone, CheckCircle, X, Sparkles } from 'lucide-react';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [installSuccess, setInstallSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'auto' | 'android' | 'ios'>(
    isIOS ? 'ios' : isAndroid ? 'android' : 'auto'
  );

  if (!isOpen) return null;

  const handleNativeInstall = async () => {
    const success = await install();
    if (success) {
      setInstallSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1800);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 select-none"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-[#202124] text-white border-2 border-white rounded-none p-5 sm:p-6 shadow-2xl font-pixel"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-white border border-transparent hover:border-white transition cursor-pointer"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with Pixel Bat */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-white flex items-center justify-center text-[#202124] border border-white">
            <Smartphone className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white tracking-wider">
              BAIXAR BATBLACK
            </h2>
            <p className="text-[9px] sm:text-[10px] text-gray-400 mt-0.5">
              App para Android e iPhone / iPad
            </p>
          </div>
        </div>

        {/* Installed State */}
        {isInstalled ? (
          <div className="text-center py-6">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
            <p className="text-xs text-white mb-2">BATBLACK JÁ INSTALADO!</p>
            <p className="text-[9px] text-gray-400 font-sans">
              Você já pode jogar direto pela sua tela inicial sem barras do navegador e 100% offline.
            </p>
            <button
              onClick={onClose}
              className="mt-5 w-full py-2.5 bg-white text-[#202124] text-xs font-bold hover:bg-gray-200 cursor-pointer"
            >
              FECHAR
            </button>
          </div>
        ) : installSuccess ? (
          <div className="text-center py-6">
            <Sparkles className="w-12 h-12 text-yellow-300 mx-auto mb-3 animate-pulse" />
            <p className="text-xs text-white mb-2">INSTALANDO BATBLACK...</p>
            <p className="text-[9px] text-gray-400">Verifique a tela inicial do seu dispositivo!</p>
          </div>
        ) : (
          <>
            {/* Tabs for Manual Guidance */}
            <div className="flex border-b border-gray-700 mb-4 text-[10px]">
              <button
                onClick={() => setActiveTab('android')}
                className={`flex-1 py-2 text-center transition cursor-pointer ${
                  activeTab === 'android'
                    ? 'border-b-2 border-white text-white font-bold bg-white/5'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                ANDROID
              </button>
              <button
                onClick={() => setActiveTab('ios')}
                className={`flex-1 py-2 text-center transition cursor-pointer ${
                  activeTab === 'ios'
                    ? 'border-b-2 border-white text-white font-bold bg-white/5'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                iOS (IPHONE)
              </button>
            </div>

            {/* DIRECT 1-CLICK INSTALL BUTTON (when supported by browser) */}
            {isInstallable && (
              <div className="mb-4">
                <button
                  onClick={handleNativeInstall}
                  className="w-full py-3 bg-white text-[#202124] text-xs font-bold flex items-center justify-center gap-2 hover:bg-gray-200 active:scale-98 transition shadow-lg cursor-pointer border-2 border-white animate-pulse"
                >
                  <Download className="w-4 h-4" /> INSTALAR AGORA (1 CLIQUE)
                </button>
                <p className="text-[8px] text-gray-400 text-center mt-1.5">
                  Download direto para o seu aparelho
                </p>
              </div>
            )}

            {/* TAB CONTENT: ANDROID */}
            {activeTab === 'android' && (
              <div className="space-y-3 font-sans text-xs text-gray-300 bg-white/5 p-3 border border-white/10">
                <p className="font-pixel text-[10px] text-white">COMO INSTALAR NO ANDROID:</p>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 flex items-center justify-center bg-white text-[#202124] font-bold text-[10px] shrink-0 font-pixel">
                    1
                  </span>
                  <p className="text-[11px] leading-snug">
                    No Chrome, toque no menu de <strong>três pontos (⋮)</strong> no canto superior direito.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 flex items-center justify-center bg-white text-[#202124] font-bold text-[10px] shrink-0 font-pixel">
                    2
                  </span>
                  <p className="text-[11px] leading-snug">
                    Toque em <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 flex items-center justify-center bg-white text-[#202124] font-bold text-[10px] shrink-0 font-pixel">
                    3
                  </span>
                  <p className="text-[11px] leading-snug">
                    Pronto! O ícone do <strong>BatBlack</strong> aparecerá junto aos seus outros aplicativos.
                  </p>
                </div>
              </div>
            )}

            {/* TAB CONTENT: iOS (SAFARI) */}
            {activeTab === 'ios' && (
              <div className="space-y-3 font-sans text-xs text-gray-300 bg-white/5 p-3 border border-white/10">
                <p className="font-pixel text-[10px] text-white">COMO INSTALAR NO IPHONE / IPAD:</p>
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 flex items-center justify-center bg-white text-[#202124] font-bold text-[10px] shrink-0 font-pixel">
                    1
                  </div>
                  <p className="text-[11px] leading-snug flex items-center gap-1.5 flex-wrap">
                    No <strong>Safari</strong>, toque no botão <strong>Compartilhar</strong>{' '}
                    <Share className="w-3.5 h-3.5 inline text-blue-400" /> na barra inferior.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 flex items-center justify-center bg-white text-[#202124] font-bold text-[10px] shrink-0 font-pixel">
                    2
                  </div>
                  <p className="text-[11px] leading-snug flex items-center gap-1.5 flex-wrap">
                    Role e toque em <strong>"Adicionar à Tela de Início"</strong>{' '}
                    <PlusSquare className="w-3.5 h-3.5 inline text-green-400" />.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 flex items-center justify-center bg-white text-[#202124] font-bold text-[10px] shrink-0 font-pixel">
                    3
                  </div>
                  <p className="text-[11px] leading-snug">
                    Toque em <strong>"Adicionar"</strong> no canto superior. O jogo abrirá em tela cheia sem barra de endereço!
                  </p>
                </div>
              </div>
            )}

            {/* Offline & Performance Benefits */}
            <div className="mt-4 pt-3 border-t border-gray-800 text-[8px] text-gray-400 flex items-center justify-between font-pixel">
              <span>⚡ 100% OFFLINE</span>
              <span>🎮 TELA CHEIA NATIVA</span>
              <span>💾 SALVA RECORDES</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
