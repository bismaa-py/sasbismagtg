import { useRef } from 'react';
import { Calendar } from 'lucide-react';

/**
 * Custom date input yang menampilkan format dd/mm/yyyy (Indonesia)
 * Value tetap menggunakan format yyyy-mm-dd secara internal (untuk kompatibilitas API)
 */
export default function DateInput({ value, onChange, className = '', style = {}, min, max, ...props }) {
  const dateRef = useRef(null);

  // Format yyyy-mm-dd → dd/mm/yyyy untuk display
  const formatDisplay = (val) => {
    if (!val) return '';
    const parts = val.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return val;
  };

  const openPicker = () => {
    if (dateRef.current) {
      // showPicker() is supported in modern browsers
      if (typeof dateRef.current.showPicker === 'function') {
        dateRef.current.showPicker();
      } else {
        dateRef.current.focus();
        dateRef.current.click();
      }
    }
  };

  return (
    <div style={{ position: 'relative', display: 'inline-flex', ...style }}>
      <input
        type="text"
        className={className}
        value={formatDisplay(value)}
        readOnly
        placeholder="dd/mm/yyyy"
        onClick={openPicker}
        style={{ cursor: 'pointer', width: '100%', paddingRight: 36 }}
        {...props}
      />
      {/* Calendar icon */}
      <Calendar
        size={15}
        style={{
          position: 'absolute',
          right: 10,
          top: '50%',
          transform: 'translateY(-50%)',
          color: 'var(--text-muted)',
          pointerEvents: 'none'
        }}
      />
      {/* Hidden native date input for picker functionality */}
      <input
        ref={dateRef}
        type="date"
        value={value}
        onChange={onChange}
        min={min}
        max={max}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          opacity: 0,
          cursor: 'pointer',
          zIndex: 1
        }}
        tabIndex={-1}
      />
    </div>
  );
}
