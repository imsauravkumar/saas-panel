import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Keyboard,
  RotateCcw,
  X,
} from 'lucide-react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const HOURS_12 = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINUTES_STEP5 = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

const CustomDateTimePicker = ({
  value,
  onChange,
  disabled = false,
  placeholder = 'Select date & time...',
  timezoneLabel = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const dialRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [alignRight, setAlignRight] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Parse current value or default
  const parsedDate = useMemo(() => {
    if (!value) return new Date();
    const d = new Date(value);
    return isNaN(d.getTime()) ? new Date() : d;
  }, [value]);

  // Working state when dialog is open
  const [activeTab, setActiveTab] = useState('date'); // 'date' | 'time'
  const [selectedYear, setSelectedYear] = useState(parsedDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(parsedDate.getMonth());
  const [selectedDay, setSelectedDay] = useState(parsedDate.getDate());
  
  // 12-hour clock state
  const initialHours = parsedDate.getHours();
  const [selectedHour12, setSelectedHour12] = useState(initialHours % 12 || 12);
  const [selectedMinute, setSelectedMinute] = useState(parsedDate.getMinutes());
  const [period, setPeriod] = useState(initialHours >= 12 ? 'PM' : 'AM');
  
  // Clock dial mode: 'hours' | 'minutes'
  const [clockMode, setClockMode] = useState('hours');
  // Manual input mode
  const [manualInputMode, setManualInputMode] = useState(false);
  
  // Calendar view navigation
  const [viewYear, setViewYear] = useState(parsedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsedDate.getMonth());

  // Screen resize & boundary checking
  const checkScreenAndPosition = useCallback(() => {
    const mobile = window.innerWidth <= 640;
    setIsMobile(mobile);

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const popoverWidth = 330;
      if (rect.left + popoverWidth > window.innerWidth - 16) {
        setAlignRight(true);
      } else {
        setAlignRight(false);
      }
    }
  }, []);

  useEffect(() => {
    checkScreenAndPosition();
    window.addEventListener('resize', checkScreenAndPosition);
    return () => window.removeEventListener('resize', checkScreenAndPosition);
  }, [checkScreenAndPosition]);

  // Reset working state when opening
  useEffect(() => {
    if (isOpen) {
      checkScreenAndPosition();
      const d = parsedDate;
      setSelectedYear(d.getFullYear());
      setSelectedMonth(d.getMonth());
      setSelectedDay(d.getDate());
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());

      const h = d.getHours();
      setSelectedHour12(h % 12 || 12);
      setSelectedMinute(d.getMinutes());
      setPeriod(h >= 12 ? 'PM' : 'AM');
      setActiveTab('date');
      setClockMode('hours');
      setManualInputMode(false);
    }
  }, [isOpen, parsedDate, checkScreenAndPosition]);

  // Close on outside click on desktop
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!isMobile && containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen && !isMobile) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, isMobile]);

  // Lock body scroll on mobile when opened
  useEffect(() => {
    if (isOpen && isMobile) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, isMobile]);

  // Format Helper to output `YYYY-MM-DDTHH:mm`
  const formatToInputValue = (year, month, day, hour12, min, ampm) => {
    const pad = (n) => String(n).padStart(2, '0');
    let h24 = hour12 % 12;
    if (ampm === 'PM') h24 += 12;
    return `${year}-${pad(month + 1)}-${pad(day)}T${pad(h24)}:${pad(min)}`;
  };

  // Formatted Label for the trigger input box
  const formattedDisplayValue = useMemo(() => {
    if (!value) return '';
    try {
      const d = new Date(value);
      if (isNaN(d.getTime())) return value;
      
      const weekday = d.toLocaleDateString([], { weekday: 'short' });
      const monthStr = d.toLocaleDateString([], { month: 'short' });
      const day = d.getDate();
      const year = d.getFullYear();
      
      let hours = d.getHours();
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      
      return `${weekday}, ${monthStr} ${day}, ${year} • ${hours}:${minutes} ${ampm}`;
    } catch (_e) {
      return value;
    }
  }, [value]);

  // Apply changes to parent
  const handleConfirm = () => {
    const newVal = formatToInputValue(
      selectedYear,
      selectedMonth,
      selectedDay,
      selectedHour12,
      selectedMinute,
      period
    );
    onChange(newVal);
    setIsOpen(false);
  };

  // Calendar Day Selection -> Auto advances to Time Picker
  const handleSelectDay = (day, monthOffset = 0) => {
    let targetMonth = viewMonth + monthOffset;
    let targetYear = viewYear;

    if (targetMonth < 0) {
      targetMonth = 11;
      targetYear -= 1;
    } else if (targetMonth > 11) {
      targetMonth = 0;
      targetYear += 1;
    }

    setSelectedYear(targetYear);
    setSelectedMonth(targetMonth);
    setSelectedDay(day);
    
    // Smoothly switch to clock tab
    setActiveTab('time');
    setClockMode('hours');
  };

  // Preset Shortcuts
  const handlePreset = (type) => {
    const now = new Date();
    let target = new Date();

    if (type === 'today') {
      target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0);
    } else if (type === 'tomorrow') {
      target = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 10, 0);
    } else if (type === 'next-monday') {
      const daysUntilMon = ((1 + 7 - now.getDay()) % 7) || 7;
      target = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilMon, 10, 0);
    } else if (type === 'in-1h') {
      target = new Date(now.getTime() + 60 * 60 * 1000);
      target.setMinutes(Math.ceil(target.getMinutes() / 15) * 15, 0, 0);
    }

    setSelectedYear(target.getFullYear());
    setSelectedMonth(target.getMonth());
    setSelectedDay(target.getDate());
    setViewYear(target.getFullYear());
    setViewMonth(target.getMonth());

    const h = target.getHours();
    setSelectedHour12(h % 12 || 12);
    setSelectedMinute(target.getMinutes());
    setPeriod(h >= 12 ? 'PM' : 'AM');
  };

  // Calendar Math
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
  const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();

  const isToday = (d, m, y) => {
    const today = new Date();
    return today.getDate() === d && today.getMonth() === m && today.getFullYear() === y;
  };

  const isSelected = (d, m, y) => {
    return selectedDay === d && selectedMonth === m && selectedYear === y;
  };

  // Clock Dial Geometry (Compact & Sleek)
  const dialRadius = 72; // px
  const centerCoord = 95; // px in a 190x190 svg/dial

  // Hour Dial calculation
  const getHourAngle = (h) => ((h % 12) * 30 - 90) * (Math.PI / 180);
  const getMinuteAngle = (m) => ((m / 60) * 360 - 90) * (Math.PI / 180);

  const currentAngle =
    clockMode === 'hours'
      ? getHourAngle(selectedHour12)
      : getMinuteAngle(selectedMinute);

  const handEndX = centerCoord + dialRadius * Math.cos(currentAngle);
  const handEndY = centerCoord + dialRadius * Math.sin(currentAngle);

  // Compute angle from event client coordinates
  const calculateDialAngle = (clientX, clientY, switchOnHour = false) => {
    if (!dialRef.current) return;
    const rect = dialRef.current.getBoundingClientRect();
    const x = clientX - rect.left - (rect.width / 2);
    const y = clientY - rect.top - (rect.height / 2);

    let angleDeg = (Math.atan2(y, x) * 180) / Math.PI + 90;
    if (angleDeg < 0) angleDeg += 360;

    if (clockMode === 'hours') {
      let h = Math.round(angleDeg / 30);
      if (h === 0) h = 12;
      setSelectedHour12(h);
      if (switchOnHour) {
        setTimeout(() => setClockMode('minutes'), 220);
      }
    } else {
      let m = Math.round(angleDeg / 6) % 60;
      setSelectedMinute(m);
    }
  };

  // Pointer / Mouse / Touch handlers for dragging and tapping
  const handlePointerDown = (e) => {
    setIsDragging(true);
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    calculateDialAngle(clientX, clientY, false);
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    calculateDialAngle(clientX, clientY, false);
  };

  const handlePointerUp = (e) => {
    if (!isDragging) return;
    setIsDragging(false);
    const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
    const clientY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
    calculateDialAngle(clientX, clientY, clockMode === 'hours');
  };

  return (
    <div className="custom-datetime-container" ref={containerRef}>
      {/* Trigger Input Box */}
      <button
        type="button"
        className={`custom-datetime-trigger ${isOpen ? 'is-open' : ''} ${disabled ? 'is-disabled' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <div className="custom-datetime-trigger-content">
          <CalendarIcon size={15} className="custom-datetime-icon" />
          <span className="custom-datetime-value">
            {formattedDisplayValue || <span className="custom-datetime-placeholder">{placeholder}</span>}
          </span>
        </div>
        <div className="custom-datetime-trigger-right">
          {timezoneLabel && <span className="custom-datetime-tz">{timezoneLabel}</span>}
          <ChevronDown size={14} className={`custom-datetime-chevron ${isOpen ? 'rotate' : ''}`} />
        </div>
      </button>

      {/* Mobile Backdrop Overlay */}
      {isOpen && isMobile && (
        <div
          className="material-picker-mobile-overlay"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Modern Popover Picker (Calendar + Material Clock Dial) */}
      {isOpen && (
        <div
          className={`custom-datetime-popover material-picker-popover ${alignRight ? 'align-right' : ''} ${
            isMobile ? 'is-mobile-dialog' : ''
          }`}
        >
          {/* Mobile Sheet Header (if on mobile) */}
          {isMobile && (
            <div className="material-picker-mobile-bar">
              <span className="material-picker-mobile-title">
                {activeTab === 'date' ? 'Select Date' : 'Select Time'}
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-icon btn-sm"
                onClick={() => setIsOpen(false)}
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Header Step Segmented Tabs */}
          <div className="material-picker-tabs">
            <button
              type="button"
              className={`material-tab-btn ${activeTab === 'date' ? 'active' : ''}`}
              onClick={() => setActiveTab('date')}
            >
              <CalendarIcon size={13} />
              <span>
                {MONTH_NAMES[selectedMonth].slice(0, 3)} {selectedDay}, {selectedYear}
              </span>
            </button>

            <button
              type="button"
              className={`material-tab-btn ${activeTab === 'time' ? 'active' : ''}`}
              onClick={() => setActiveTab('time')}
            >
              <Clock size={13} />
              <span>
                {selectedHour12}:{String(selectedMinute).padStart(2, '0')} {period}
              </span>
            </button>
          </div>

          {/* Quick Presets Bar */}
          <div className="custom-datetime-presets">
            <button
              type="button"
              className="custom-datetime-preset-btn"
              onClick={() => handlePreset('in-1h')}
            >
              In 1 Hour
            </button>
            <button
              type="button"
              className="custom-datetime-preset-btn"
              onClick={() => handlePreset('today')}
            >
              Today
            </button>
            <button
              type="button"
              className="custom-datetime-preset-btn"
              onClick={() => handlePreset('tomorrow')}
            >
              Tomorrow
            </button>
            <button
              type="button"
              className="custom-datetime-preset-btn"
              onClick={() => handlePreset('next-monday')}
            >
              Next Mon
            </button>
          </div>

          {/* Body: STEP 1 (Calendar) vs STEP 2 (Material Clock) */}
          <div className="material-picker-body">
            {activeTab === 'date' ? (
              /* ================= STEP 1: CALENDAR VIEW ================= */
              <div className="material-calendar-view">
                {/* Month/Year Nav */}
                <div className="custom-datetime-nav">
                  <button
                    type="button"
                    className="custom-datetime-nav-btn"
                    onClick={() => {
                      if (viewMonth === 0) {
                        setViewMonth(11);
                        setViewYear(viewYear - 1);
                      } else {
                        setViewMonth(viewMonth - 1);
                      }
                    }}
                    title="Previous month"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <div className="custom-datetime-month-label">
                    <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--color-text-primary)' }}>
                      {MONTH_NAMES[viewMonth]} {viewYear}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="custom-datetime-nav-btn"
                    onClick={() => {
                      if (viewMonth === 11) {
                        setViewMonth(0);
                        setViewYear(viewYear + 1);
                      } else {
                        setViewMonth(viewMonth + 1);
                      }
                    }}
                    title="Next month"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                {/* Weekday labels */}
                <div className="material-weekdays">
                  {WEEKDAY_NAMES.map((w) => (
                    <div key={w} className="material-weekday">
                      {w}
                    </div>
                  ))}
                </div>

                {/* Days Grid */}
                <div className="material-days-grid">
                  {/* Previous month padding days */}
                  {Array.from({ length: firstDayIndex }).map((_, idx) => {
                    const dayNum = prevMonthDays - firstDayIndex + idx + 1;
                    return (
                      <button
                        key={`prev-${idx}`}
                        type="button"
                        className="material-day-cell is-muted"
                        onClick={() => handleSelectDay(dayNum, -1)}
                      >
                        {dayNum}
                      </button>
                    );
                  })}

                  {/* Current month days */}
                  {Array.from({ length: daysInMonth }).map((_, idx) => {
                    const dayNum = idx + 1;
                    const active = isSelected(dayNum, viewMonth, viewYear);
                    const current = isToday(dayNum, viewMonth, viewYear);

                    return (
                      <button
                        key={`cur-${dayNum}`}
                        type="button"
                        className={`material-day-cell ${active ? 'is-selected' : ''} ${current ? 'is-today' : ''}`}
                        onClick={() => handleSelectDay(dayNum, 0)}
                      >
                        <span>{dayNum}</span>
                      </button>
                    );
                  })}

                  {/* Next month padding days */}
                  {Array.from({
                    length: (7 - ((firstDayIndex + daysInMonth) % 7)) % 7,
                  }).map((_, idx) => {
                    const dayNum = idx + 1;
                    return (
                      <button
                        key={`next-${idx}`}
                        type="button"
                        className="material-day-cell is-muted"
                        onClick={() => handleSelectDay(dayNum, 1)}
                      >
                        {dayNum}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* ================= STEP 2: MATERIAL CLOCK VIEW ================= */
              <div className="material-clock-view">
                {/* Big Digital Display & AM/PM Toggle */}
                <div className="material-clock-digital-header">
                  <div className="material-digital-time-boxes">
                    <button
                      type="button"
                      className={`material-time-box ${clockMode === 'hours' && !manualInputMode ? 'is-active' : ''}`}
                      onClick={() => {
                        setClockMode('hours');
                        setManualInputMode(false);
                      }}
                    >
                      {String(selectedHour12).padStart(2, '0')}
                    </button>
                    <span className="material-time-colon">:</span>
                    <button
                      type="button"
                      className={`material-time-box ${clockMode === 'minutes' && !manualInputMode ? 'is-active' : ''}`}
                      onClick={() => {
                        setClockMode('minutes');
                        setManualInputMode(false);
                      }}
                    >
                      {String(selectedMinute).padStart(2, '0')}
                    </button>
                  </div>

                  <div className="material-ampm-toggle">
                    <button
                      type="button"
                      className={`material-ampm-btn ${period === 'AM' ? 'is-active' : ''}`}
                      onClick={() => setPeriod('AM')}
                    >
                      AM
                    </button>
                    <button
                      type="button"
                      className={`material-ampm-btn ${period === 'PM' ? 'is-active' : ''}`}
                      onClick={() => setPeriod('PM')}
                    >
                      PM
                    </button>
                  </div>
                </div>

                {/* Subtitle / Mode Indicator */}
                <div className="material-clock-subtext">
                  <span>{clockMode === 'hours' ? 'Select Hour (1 - 12)' : 'Select Minute (00 - 59)'}</span>
                </div>

                {manualInputMode ? (
                  /* Manual Keyboard Input Option */
                  <div className="material-manual-time-input">
                    <div className="form-group" style={{ marginBottom: 0, width: '90px' }}>
                      <label className="form-label" style={{ fontSize: '11px' }}>Hour (1-12)</label>
                      <input
                        type="number"
                        min="1"
                        max="12"
                        className="form-input"
                        value={selectedHour12}
                        onChange={(e) => {
                          const val = Math.max(1, Math.min(12, Number(e.target.value) || 1));
                          setSelectedHour12(val);
                        }}
                        style={{ textAlign: 'center', fontSize: '16px', fontWeight: 700 }}
                      />
                    </div>
                    <span style={{ fontSize: '20px', fontWeight: 700, marginTop: '20px' }}>:</span>
                    <div className="form-group" style={{ marginBottom: 0, width: '90px' }}>
                      <label className="form-label" style={{ fontSize: '11px' }}>Minute (0-59)</label>
                      <input
                        type="number"
                        min="0"
                        max="59"
                        className="form-input"
                        value={selectedMinute}
                        onChange={(e) => {
                          const val = Math.max(0, Math.min(59, Number(e.target.value) || 0));
                          setSelectedMinute(val);
                        }}
                        style={{ textAlign: 'center', fontSize: '16px', fontWeight: 700 }}
                      />
                    </div>
                  </div>
                ) : (
                  /* Interactive Analog Clock Face with Touch/Mouse Drag Support */
                  <div
                    className="material-clock-face"
                    ref={dialRef}
                    onMouseDown={handlePointerDown}
                    onMouseMove={handlePointerMove}
                    onMouseUp={handlePointerUp}
                    onTouchStart={handlePointerDown}
                    onTouchMove={handlePointerMove}
                    onTouchEnd={handlePointerUp}
                  >
                    <svg
                      className="material-clock-svg"
                      viewBox="0 0 190 190"
                      width="190"
                      height="190"
                    >
                      {/* Clock Background Circle */}
                      <circle cx={centerCoord} cy={centerCoord} r="88" className="material-clock-bg-circle" />

                      {/* Center Pin */}
                      <circle cx={centerCoord} cy={centerCoord} r="3.5" className="material-clock-center-pin" />

                      {/* Animated Pointer Hand */}
                      <line
                        x1={centerCoord}
                        y1={centerCoord}
                        x2={handEndX}
                        y2={handEndY}
                        className="material-clock-hand-line"
                      />

                      {/* Selected Bulb Circle */}
                      <circle cx={handEndX} cy={handEndY} r="14" className="material-clock-bulb-circle" />
                    </svg>

                    {/* Clock Numbers Overlay */}
                    {clockMode === 'hours'
                      ? HOURS_12.map((h) => {
                          const angle = getHourAngle(h);
                          const x = centerCoord + dialRadius * Math.cos(angle);
                          const y = centerCoord + dialRadius * Math.sin(angle);
                          const isSel = selectedHour12 === h;

                          return (
                            <span
                              key={h}
                              className={`material-clock-number ${isSel ? 'is-selected' : ''}`}
                              style={{ left: `${x}px`, top: `${y}px` }}
                            >
                              {h}
                            </span>
                          );
                        })
                      : MINUTES_STEP5.map((m) => {
                          const angle = getMinuteAngle(m);
                          const x = centerCoord + dialRadius * Math.cos(angle);
                          const y = centerCoord + dialRadius * Math.sin(angle);
                          const isSel = Math.abs(selectedMinute - m) < 3;

                          return (
                            <span
                              key={m}
                              className={`material-clock-number ${isSel ? 'is-selected' : ''}`}
                              style={{ left: `${x}px`, top: `${y}px` }}
                            >
                              {String(m).padStart(2, '0')}
                            </span>
                          );
                        })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Bar with Action Controls */}
          <div className="material-picker-footer">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                className="btn btn-ghost btn-icon btn-sm"
                onClick={() => setManualInputMode(!manualInputMode)}
                title={manualInputMode ? 'Switch to Clock Face' : 'Type Time via Keyboard'}
              >
                {manualInputMode ? <RotateCcw size={14} /> : <Keyboard size={15} />}
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ fontSize: '12px', padding: '5px 12px' }}
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </button>

              <button
                type="button"
                className="btn btn-primary btn-sm"
                style={{ fontSize: '12px', padding: '5px 16px', fontWeight: 600 }}
                onClick={handleConfirm}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomDateTimePicker;

