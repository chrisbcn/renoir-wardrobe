import React from 'react';

/**
 * Reusable MAURA loader component
 * Can be used as an overlay or standalone
 */
const MauraLoader = ({ 
  message = "Loading your wardrobe", 
  showBackground = false,
  backgroundImage = null 
}) => {
  return (
    <div 
      className="maura-loader-fullscreen"
      style={{
        backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'none',
        backgroundColor: showBackground ? 'transparent' : 'rgba(0, 0, 0, 0.9)'
      }}
    >
      <div className="loader-container">
        {/* Rotating ring */}
        <div className="loading-ring"></div>
        
        {/* Centered MAURA logo */}
        <div className="logo-container">
          <svg className="maura-logo" fill="none" preserveAspectRatio="none" viewBox="0 0 59 11">
            <g clipPath="url(#clip0_1_34)">
              <path d="M48.5234 9.67549L53.1294 0H54.9992L59.6049 9.67549H57.2185L56.3063 7.63073H51.7157L50.8189 9.67549H48.5234ZM53.9655 2.5337L52.4605 5.95642H55.5615L54.0568 2.5337H53.9655Z" fill="white" />
              <path d="M39.9161 9.67549H37.7422V0H43.245C44.6587 0 45.5861 0.400059 46.2245 1.05201C46.7411 1.58542 47.0451 2.28181 47.0451 3.0523C47.0451 4.29694 46.2547 5.26002 45.0387 5.77861L47.3643 9.67549H44.8715L42.865 6.11942H39.9161V9.67549ZM43.3209 1.79285H39.9161V4.32655H43.4729C44.2331 4.32655 44.8564 3.79314 44.8564 3.0523C44.8564 2.72632 44.7346 2.42999 44.5067 2.20773C44.1569 1.8373 43.7162 1.79285 43.3209 1.79285Z" fill="white" />
              <path d="M32.2925 0H34.4816V6.19349C34.4816 8.60866 32.5664 9.97183 29.9366 9.97183C27.3828 9.97183 25.4219 8.60866 25.4219 6.19349V0H27.6108V6.19349C27.6108 7.46777 28.6596 8.14935 29.9366 8.14935C31.2893 8.14935 32.2925 7.46777 32.2925 6.19349V0Z" fill="white" />
              <path d="M12.6797 9.67549L17.2855 0H19.1552L23.7611 9.67549H21.3745L20.4625 7.63073H15.8719L14.975 9.67549H12.6797ZM18.1216 2.5337L16.6167 5.95642H19.7177L18.2128 2.5337H18.1216Z" fill="white" />
              <path d="M10.6254 9.6754H8.43653V4.05976H8.36053L5.57878 8.57894H4.97074L2.18901 4.05976H2.113V9.6754H9.62187e-05V-8.54477e-05H2.0826L5.33557 5.30439H5.36598L8.60374 -8.54477e-05H10.6254V9.6754Z" fill="white" />
            </g>
            <defs>
              <clipPath id="clip0_1_34">
                <rect fill="white" height="10.1273" width="58.9581" />
              </clipPath>
            </defs>
          </svg>
        </div>
      </div>
      
      {/* Loading message */}
      <div className="loader-message">
        {message}
      </div>
    </div>
  );
};

export default MauraLoader;

