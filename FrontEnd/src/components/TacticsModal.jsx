import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import './TacticsModal.css';

const TacticsModal = ({ isOpen, onClose }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const { t } = useLanguage();

  if (!isOpen) return null;

  const slides = [
    {
      title: t("tactics.slide1Title"),
      icon: "dashboard_customize",
      content: (
        <ul>
          <li><strong>{t("tactics.slide1List1Prefix")}</strong>{t("tactics.slide1List1Text")}</li>
          <li><strong>{t("tactics.slide1List2Prefix")}</strong>{t("tactics.slide1List2Text")}</li>
        </ul>
      ),
      visual: (
        <div className="mini-grid pulse-anim">
          {Array.from({ length: 100 }).map((_, i) => {
            // T-shape (4), L-shape (4), Square (4), Straight 5, Straight 3, Z-shape (4)
            const isShip = [
              11, 12, 13, 22, 
              16, 26, 36, 37, 
              61, 62, 71, 72, 
              58, 68, 78, 88, 98, 
              83, 84, 85, 
              43, 44, 54, 55
            ].includes(i);
            return (
              <div 
                key={i} 
                className={`mini-cell ${isShip ? 'ship' : ''}`} 
              />
            );
          })}
        </div>
      )
    },
    {
      title: t("tactics.slide2Title"),
      icon: "construction",
      content: (
        <ul>
          <li><strong>{t("tactics.slide2List1Prefix")}</strong>{t("tactics.slide2List1Text")}</li>
          <li><strong>{t("tactics.slide2List2Prefix")}</strong>{t("tactics.slide2List2Text")}</li>
          <li><strong>{t("tactics.slide2List3Prefix")}</strong>{t("tactics.slide2List3Text")}</li>
        </ul>
      ),
      visual: (
        <div className="mini-grid pulse-anim">
          {Array.from({ length: 100 }).map((_, i) => {
            // Một tàu rất lớn 13 ô và một tàu nhỏ 2 ô (tổng cộng 15 ô, 2 tàu)
            const isShip = [
              22, 23, 24, 25, 35, 45, 55, 65, 66, 67, 77, 87, 88, 
              28, 38
            ].includes(i);
            return (
              <div 
                key={i} 
                className={`mini-cell ${isShip ? 'ship' : ''}`} 
              />
            );
          })}
        </div>
      )
    },
    {
      title: t("tactics.slide3Title"),
      icon: "anchor",
      content: (
        <ul>
          <li><strong>{t("tactics.slide3List1Prefix")}</strong>{t("tactics.slide3List1Text")}</li>
          <li><strong>{t("tactics.slide3List2Prefix")}</strong>{t("tactics.slide3List2Text")}</li>
          <li><strong>{t("tactics.slide3List3Prefix")}</strong>{t("tactics.slide3List3Text")}</li>
        </ul>
      ),
      visual: (
        <div className="mini-grid">
          {Array.from({ length: 100 }).map((_, i) => {
            const x = i % 10;
            const y = Math.floor(i / 10);
            const isEdge = x === 0 || x === 9 || y === 0 || y === 9;
            const isCenter = x >= 3 && x <= 6 && y >= 3 && y <= 6;
            return <div key={i} className={`mini-cell ${isEdge ? 'green-zone' : ''} ${isCenter ? 'red-zone' : ''}`} />
          })}
        </div>
      )
    },
    {
      title: t("tactics.slide4Title"),
      icon: "grid_on",
      content: (
        <ul>
          <li><strong>{t("tactics.slide4List1Prefix")}</strong>{t("tactics.slide4List1Text")}</li>
          <li><strong>{t("tactics.slide4List2Prefix")}</strong>{t("tactics.slide4List2Text")}</li>
        </ul>
      ),
      visual: (
        <div className="mini-grid pulse-anim">
          {Array.from({ length: 100 }).map((_, i) => {
            const x = i % 10;
            const y = Math.floor(i / 10);
            const isChecker = (x + y) % 2 === 0;
            return <div key={i} className={`mini-cell ${isChecker ? 'checker' : ''}`} />
          })}
        </div>
      )
    },
    {
      title: t("tactics.slide5Title"),
      icon: "my_location",
      content: (
        <ul>
          <li><strong>{t("tactics.slide5List1Prefix")}</strong>{t("tactics.slide5List1Text")}</li>
          <li><strong>{t("tactics.slide5List2Prefix")}</strong>{t("tactics.slide5List2Text")}</li>
          <li><strong>{t("tactics.slide5List3Prefix")}</strong>{t("tactics.slide5List3Text")}</li>
        </ul>
      ),
      visual: (
        <div className="mini-grid">
          {Array.from({ length: 100 }).map((_, i) => {
            const hit = i === 44 || i === 45;
            const target = i === 34 || i === 54 || i === 35 || i === 55 || i === 43 || i === 46;
            return <div key={i} className={`mini-cell ${hit ? 'hit' : ''} ${target ? 'target pulse-anim' : ''}`} />
          })}
        </div>
      )
    }
  ];

  const handleNext = () => {
    if (currentPage < slides.length - 1) setCurrentPage(currentPage + 1);
    else onClose();
  };

  const handlePrev = () => {
    if (currentPage > 0) setCurrentPage(currentPage - 1);
  };

  return (
    <div className="tactics-overlay" onMouseDown={(e) => { if(e.target === e.currentTarget) onClose(); }}>
      <div className="tactics-modal">
        <div className="tactics-header">
          <div className="tactics-title">
            <span className="material-symbols-outlined text-secondary">school</span>
            {t("tactics.title")}
          </div>
          <button className="tactics-close" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        
        <div className="tactics-body" key={currentPage}>
          <div className="tactics-slide">
            <div className="tactics-content-grid">
              <div className="tactics-text">
                <h3>
                  <span className="material-symbols-outlined">{slides[currentPage].icon}</span>
                  {slides[currentPage].title}
                </h3>
                {slides[currentPage].content}
              </div>
              <div className="tactics-visual">
                {slides[currentPage].visual}
              </div>
            </div>
          </div>
        </div>

        <div className="tactics-footer">
          <button 
            className="tactics-nav-btn secondary" 
            onClick={handlePrev}
            style={{ opacity: currentPage === 0 ? 0 : 1, pointerEvents: currentPage === 0 ? 'none' : 'auto' }}
          >
            {t("tactics.prev")}
          </button>
          
          <div className="tactics-dots">
            {slides.map((_, idx) => (
              <div key={idx} className={`tactics-dot ${currentPage === idx ? 'active' : ''}`} />
            ))}
          </div>

          <button className="tactics-nav-btn primary" onClick={handleNext}>
            {currentPage === slides.length - 1 ? t("tactics.start") : t("tactics.next")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TacticsModal;
