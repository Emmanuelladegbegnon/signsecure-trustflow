import { useNavigate } from 'react-router-dom'
import { Icon } from '../../components/ui/Icon'
import { ROUTES } from '../../routes'

export function CameraCapture() {
  const navigate = useNavigate()

  return (
    <div className="bg-black text-white h-screen overflow-hidden font-body-sm relative">
      <header className="absolute top-0 w-full z-40 flex justify-between items-center px-4 py-4 bg-gradient-to-b from-black/80 to-transparent">
        <button className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center backdrop-blur-sm text-white hover:bg-black/60 transition-colors" onClick={() => navigate(-1)}>
          <Icon name="close" />
        </button>
        <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/10">
          <Icon name="shield" filled size={16} className="text-primary-fixed-dim" />
          <span className="font-label-sm text-label-sm text-white uppercase tracking-wider">Mode Sécurisé</span>
        </div>
        <button className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center backdrop-blur-sm text-white hover:bg-black/60 transition-colors">
          <Icon name="flash_auto" />
        </button>
      </header>

      {/* Simulated camera feed */}
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black" />
      <div className="absolute inset-0 z-0" style={{ background: 'radial-gradient(circle at center, transparent 30%, rgba(0,0,0,0.6) 100%)' }} />

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[85%] h-[60%] max-w-md max-h-[800px] z-10 flex flex-col justify-center items-center">
        <div className="relative w-full h-full border border-white/20 rounded-xl overflow-hidden shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
          {Object.entries({
            tl: 'top-0 left-0 border-r-0 border-b-0 rounded-tl-xl',
            tr: 'top-0 right-0 border-l-0 border-b-0 rounded-tr-xl',
            bl: 'bottom-0 left-0 border-r-0 border-t-0 rounded-bl-xl',
            br: 'bottom-0 right-0 border-l-0 border-t-0 rounded-br-xl',
          }).map(([corner, pos]) => (
            <span key={corner} className={`absolute w-10 h-10 border-[3px] border-primary-fixed-dim ${pos}`} />
          ))}
          <div className="absolute w-full h-0.5 bg-primary-fixed-dim/80 shadow-[0_0_8px_2px_rgba(128,213,203,0.5)] top-1/2 left-0 animate-pulse" />
        </div>
        <div className="mt-4 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex items-center gap-2">
          <Icon name="document_scanner" size={18} className="text-primary-fixed-dim animate-pulse" />
          <span className="font-label-md text-label-md text-white">Maintenez le document stable</span>
        </div>
      </div>

      <div className="absolute bottom-0 w-full z-30 bg-gradient-to-t from-black via-black/90 to-transparent pb-8 pt-12 px-4 flex flex-col gap-6">
        <div className="w-full overflow-x-auto flex gap-3 px-2 pb-2">
          <div className="relative w-16 h-20 bg-white/90 rounded-md shrink-0 border-2 border-primary-fixed-dim overflow-hidden shadow-lg flex items-center justify-center text-zinc-400">
            <Icon name="description" size={24} />
            <div className="absolute bottom-0 right-0 bg-primary-fixed-dim text-on-primary-fixed w-5 h-5 flex items-center justify-center rounded-tl-md font-label-sm text-[10px]">1</div>
          </div>
          <div className="relative w-16 h-20 bg-white/70 rounded-md shrink-0 border border-white/30 overflow-hidden opacity-80 flex items-center justify-center text-zinc-400">
            <Icon name="description" size={24} />
            <div className="absolute bottom-0 right-0 bg-black/60 text-white w-5 h-5 flex items-center justify-center rounded-tl-md font-label-sm text-[10px]">2</div>
          </div>
        </div>
        <div className="flex justify-between items-center w-full max-w-sm mx-auto">
          <button className="flex flex-col items-center gap-1 opacity-80 hover:opacity-100 transition-opacity p-2">
            <Icon name="note_add" />
            <span className="font-label-sm text-[10px] text-white">Ajouter</span>
          </button>
          <button className="relative w-20 h-20 rounded-full border-4 border-white flex items-center justify-center group active:scale-95 transition-transform duration-150">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center group-hover:bg-primary-fixed-dim transition-colors duration-300">
              <div className="w-14 h-14 rounded-full border-2 border-black/10" />
            </div>
          </button>
          <button
            className="flex flex-col items-center gap-1 p-2 bg-primary-container text-on-primary-container rounded-lg px-4 py-2 font-label-md text-label-md"
            onClick={() => navigate(ROUTES.mobileCodeLabel)}
          >
            Terminer
            <span className="font-label-sm text-[10px] opacity-80">(2 pages)</span>
          </button>
        </div>
      </div>
    </div>
  )
}
