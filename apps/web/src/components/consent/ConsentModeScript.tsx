/**
 * Google Consent Mode initialization script
 * Must be loaded before any Google tags to ensure proper consent handling
 */

export function ConsentModeScript() {
	return (
		<script
			dangerouslySetInnerHTML={{
				__html: `
          // Initialize dataLayer
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          
          // Set default consent state before any tags load
          gtag('consent', 'default', {
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied',
            analytics_storage: 'denied',
            functionality_storage: 'denied',
            personalization_storage: 'denied',
            security_storage: 'granted',
            wait_for_update: 2000
          });
          
          // Region-specific settings for GDPR countries
          gtag('consent', 'default', {
            region: ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'],
            ad_storage: 'denied',
            ad_user_data: 'denied', 
            ad_personalization: 'denied',
            analytics_storage: 'denied',
            functionality_storage: 'denied',
            personalization_storage: 'denied',
            wait_for_update: 2000
          });
          
          // Check if user has existing consent and apply it immediately
          try {
            const savedConsent = localStorage.getItem('consent-state');
            if (savedConsent) {
              const consentData = JSON.parse(savedConsent);
              const consentDate = localStorage.getItem('consent-state-date');
              
              if (consentDate) {
                const consentDateObj = new Date(consentDate);
                const oneYearAgo = new Date();
                oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
                
                // Only apply if consent is still valid (less than 1 year old)
                if (consentDateObj > oneYearAgo) {
                  gtag('consent', 'update', {
                    ad_storage: consentData.advertising ? 'granted' : 'denied',
                    ad_user_data: consentData.advertising ? 'granted' : 'denied',
                    ad_personalization: consentData.personalization ? 'granted' : 'denied',
                    analytics_storage: consentData.analytics ? 'granted' : 'denied',
                    functionality_storage: 'granted',
                    personalization_storage: consentData.personalization ? 'granted' : 'denied'
                  });
                  // Debug: Log consent application
                  console.log('Applied saved consent:', consentData);
                }
              }
            }
          } catch (error) {
            // Silent fail - don't show console warnings for normal operation
          }
        `,
			}}
		/>
	);
}
