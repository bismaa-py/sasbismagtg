import { useState, useEffect, useRef } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

const MONTHS_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const DAYS_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

// Helper untuk format tanggal ke format yyyy-mm-dd secara lokal
const formatDateString = (year, monthIndex, day) => {
  const yyyy = String(year);
  const mm = String(monthIndex + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

/**
 * Custom date input yang menampilkan format dd/mm/yyyy (Indonesia)
 * Kalender popup diterjemahkan penuh ke bahasa Indonesia.
 * Value tetap menggunakan format yyyy-mm-dd secara internal (untuk kompatibilitas API)
 */
export default function DateInput({ value, onChange, className = '', style = {}, min, max, ...props }) {
  const [isOpen, setIsOpen] = useState(false);
  
  // State lokal untuk navigasi bulan & tahun kalender popup
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  
  const containerRef = useRef(null);

  // Singkronkan bulan & tahun di kalender dengan tanggal yang sudah dipilih saat popup dibuka
  useEffect(() => {
    if (isOpen) {
      const today = new Date();
      let initYear = today.getFullYear();
      let initMonth = today.getMonth();

      if (value) {
        const parts = value.split('-');
        if (parts.length === 3) {
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          if (!isNaN(y) && !isNaN(m)) {
            initYear = y;
            initMonth = m;
          }
        }
      }
      setCurrentMonth(initMonth);
      setCurrentYear(initYear);
    }
  }, [isOpen, value]);

  // Event listener untuk menutup kalender saat pengguna mengklik di luar area date picker
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Format yyyy-mm-dd → dd/mm/yyyy untuk display
  const formatDisplay = (val) => {
    if (!val) return '';
    const parts = val.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return val;
  };

  // Helper untuk mengecek apakah tanggal tertentu dinonaktifkan (di luar min/max)
  const isDateDisabled = (dateStr) => {
    if (min && dateStr < min) return true;
    if (max && dateStr > max) return true;
    return false;
  };

  // Membuat grid daftar hari dalam bulan
  const generateDays = () => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    const prevTotalDays = new Date(currentYear, currentMonth, 0).getDate();

    const cells = [];

    // Hari dari bulan sebelumnya (overlap)
    const prevMonthYear = currentMonth === 0 ? [currentYear - 1, 11] : [currentYear, currentMonth - 1];
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = prevTotalDays - i;
      const dateStr = formatDateString(prevMonthYear[0], prevMonthYear[1], d);
      cells.push({
        day: d,
        isCurrentMonth: false,
        dateStr,
        disabled: isDateDisabled(dateStr)
      });
    }

    // Hari di bulan aktif saat ini
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = formatDateString(currentYear, currentMonth, d);
      cells.push({
        day: d,
        isCurrentMonth: true,
        dateStr,
        disabled: isDateDisabled(dateStr)
      });
    }

    // Hari dari bulan berikutnya (overlap) untuk melengkapi grid 6 baris (42 sel)
    const nextMonthYear = currentMonth === 11 ? [currentYear + 1, 0] : [currentYear, currentMonth + 1];
    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const dateStr = formatDateString(nextMonthYear[0], nextMonthYear[1], d);
      cells.push({
        day: d,
        isCurrentMonth: false,
        dateStr,
        disabled: isDateDisabled(dateStr)
      });
    }

    return cells;
  };

  const days = generateDays();

  const handlePrevMonth = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(y => y - 1);
    } else {
      setCurrentMonth(m => m - 1);
    }
  };

  const handleNextMonth = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(y => y + 1);
    } else {
      setCurrentMonth(m => m + 1);
    }
  };

  const handleDayClick = (cell, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (cell.disabled) return;
    
    if (onChange) {
      onChange({ target: { value: cell.dateStr } });
    }
    setIsOpen(false);
  };

  const handleTodayClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const today = new Date();
    const todayStr = formatDateString(today.getFullYear(), today.getMonth(), today.getDate());
    
    if (isDateDisabled(todayStr)) return;

    if (onChange) {
      onChange({ target: { value: todayStr } });
    }
    setIsOpen(false);
  };

  const handleClearClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onChange) {
      onChange({ target: { value: '' } });
    }
    setIsOpen(false);
  };

  const todayDateStr = (() => {
    const today = new Date();
    return formatDateString(today.getFullYear(), today.getMonth(), today.getDate());
  })();

  return (
    <div ref={containerRef} className="date-picker-container" style={style}>
      <input
        type="text"
        className={className}
        value={formatDisplay(value)}
        readOnly
        placeholder="hh/bb/tttt"
        onClick={() => setIsOpen(open => !open)}
        style={{ cursor: 'pointer', width: '100%', paddingRight: 36 }}
        {...props}
      />
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

      {isOpen && (
        <div className="date-picker-dropdown">
          {/* Header Kalender */}
          <div className="date-picker-header">
            <button
              type="button"
              className="date-picker-nav-btn"
              onClick={handlePrevMonth}
            >
              <ChevronLeft size={16} />
            </button>
            <span className="date-picker-title">
              {MONTHS_ID[currentMonth]} {currentYear}
            </span>
            <button
              type="button"
              className="date-picker-nav-btn"
              onClick={handleNextMonth}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Label Hari */}
          <div className="date-picker-weekdays">
            {DAYS_ID.map((day, idx) => (
              <span key={idx} className="date-picker-weekday">
                {day}
              </span>
            ))}
          </div>

          {/* Grid Hari */}
          <div className="date-picker-grid">
            {days.map((cell, idx) => {
              const isSelected = cell.dateStr === value;
              const isToday = cell.dateStr === todayDateStr;
              
              let classNames = 'date-picker-day';
              if (isSelected) classNames += ' date-picker-day-selected';
              if (isToday) classNames += ' date-picker-day-today';
              if (!cell.isCurrentMonth) classNames += ' date-picker-day-muted';

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={cell.disabled}
                  className={classNames}
                  onClick={(e) => handleDayClick(cell, e)}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          {/* Footer Aksi */}
          <div className="date-picker-footer">
            <button
              type="button"
              className="date-picker-footer-btn date-picker-footer-btn-clear"
              onClick={handleClearClick}
            >
              Bersihkan
            </button>
            <button
              type="button"
              className="date-picker-footer-btn date-picker-footer-btn-today"
              disabled={isDateDisabled(todayDateStr)}
              onClick={handleTodayClick}
            >
              Hari Ini
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
