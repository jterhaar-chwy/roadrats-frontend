import React, { useState, useEffect } from 'react';
import styles from '@/styles/landingPage/landingPage.module.scss';
import { KibSectionHeading } from '@chewy/kib-content-groups-react';
import { KibButtonNew } from '@chewy/kib-controls-react';

const TimeDateDisplay: React.FC = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hour = time.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <div className={styles.timeDateCard}>
      <div className={styles.greeting}>{getGreeting()}</div>
      <div className={styles.time}>{formatTime(time)}</div>
      <div className={styles.date}>{formatDate(time)}</div>
    </div>
  );
};

const SimpleCalendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const today = new Date();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const isToday = (day: number) => {
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    );
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  return (
    <div className={styles.calendarCard}>
      <div className={styles.calendarHeader}>
        <KibButtonNew size="small" onClick={goToPreviousMonth}>
          ←
        </KibButtonNew>
        <h3 className={styles.calendarMonth}>
          {monthNames[month]} {year}
        </h3>
        <KibButtonNew size="small" onClick={goToNextMonth}>
          →
        </KibButtonNew>
      </div>
      
      <div className={styles.calendarWeekdays}>
        {weekDays.map(day => (
          <div key={day} className={styles.weekday}>{day}</div>
        ))}
      </div>
      
      <div className={styles.calendarDays}>
        {Array.from({ length: startingDayOfWeek }, (_, i) => (
          <div key={`empty-${i}`} className={styles.calendarDayEmpty}></div>
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          return (
            <div
              key={day}
              className={`${styles.calendarDay} ${isToday(day) ? styles.calendarDayToday : ''}`}
            >
              {day}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const Dashboard: React.FC = () => {
  return (
    <div className={styles.dashboard}>
      {/* F-Shape: Second horizontal scan area */}
      <div className={styles.heroSection}>
        <KibSectionHeading 
          heading="System Overview" 
          subheading="Monitor your databases and services in real-time"
          className={styles.heroHeading}
        >
          <div className={styles.heroActions}>
            <KibButtonNew size="large">
              Connect Database
            </KibButtonNew>
            <KibButtonNew size="large">
              View All Reports
            </KibButtonNew>
          </div>
        </KibSectionHeading>
      </div>

      {/* Time and Date Display */}
      <div className={styles.timeDateSection}>
        <TimeDateDisplay />
      </div>

      {/* Calendar Widget */}
      <div className={styles.calendarSection}>
        <SimpleCalendar />
      </div>
    </div>
  );
}; 