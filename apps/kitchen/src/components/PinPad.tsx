interface Props {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  loading?: boolean
  error?: string
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✓']

export default function PinPad({ value, onChange, onSubmit, loading, error }: Props) {
  function handleKey(key: string) {
    if (loading) return
    if (key === '⌫') {
      onChange(value.slice(0, -1))
    } else if (key === '✓') {
      if (value.length === 4) onSubmit()
    } else if (value.length < 4) {
      const next = value + key
      onChange(next)
      if (next.length === 4) {
        // Auto-submit on 4th digit after a brief delay
        setTimeout(onSubmit, 80)
      }
    }
  }

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Dots */}
      <div className="flex gap-5">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`w-5 h-5 rounded-full border-2 transition-all ${
              i < value.length
                ? 'bg-green-400 border-green-400'
                : 'bg-transparent border-slate-500'
            }`}
          />
        ))}
      </div>

      {error && (
        <p className="text-red-400 text-sm font-medium">{error}</p>
      )}

      {/* Grid */}
      <div className="grid grid-cols-3 gap-3">
        {KEYS.map((key) => {
          const isConfirm = key === '✓'
          const isDelete = key === '⌫'
          const isDisabled =
            loading ||
            (isConfirm && value.length !== 4)

          return (
            <button
              key={key}
              onClick={() => handleKey(key)}
              disabled={isDisabled}
              className={`
                w-20 h-20 rounded-2xl text-2xl font-bold
                transition-all active:scale-95
                ${isConfirm
                  ? 'bg-green-500 text-white disabled:opacity-40'
                  : isDelete
                  ? 'bg-slate-600 text-slate-200'
                  : 'bg-slate-700 text-white active:bg-slate-600'}
              `}
            >
              {loading && isConfirm ? '...' : key}
            </button>
          )
        })}
      </div>
    </div>
  )
}
