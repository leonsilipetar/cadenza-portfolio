import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import ApiConfig from '../components/apiConfig';
import { sendAnalytics } from '../utils/analytics';
import './ReportProblem.css';

const ReportProblem = () => {
  const navigate = useNavigate();
  const user = useSelector(state => state.user);
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    category: '',
    subcategory: '',
    description: '',
    steps: ''
  });

  const problemCategories = {
    'login': {
      label: 'Problem s prijavom',
      subcategories: [
        'Ne mogu se prijaviti',
        'Zaboravljena lozinka ne radi',
        'Sesija se često prekida',
        'Ostalo'
      ]
    },
    'functionality': {
      label: 'Problem s funkcionalnosti',
      subcategories: [
        'Chat ne radi ispravno',
        'Ne mogu učitati dokumente',
        'Problem s rasporedom',
        'Problem s obavijestima',
        'Ostalo'
      ]
    },
    'visual': {
      label: 'Vizualni problemi',
      subcategories: [
        'Nepravilno prikazivanje na mobitelu',
        'Problem s temom (svijetla/tamna)',
        'Elementi se preklapaju',
        'Ostalo'
      ]
    },
    'missing': {
      label: 'Nedostaje funkcionalnost',
      subcategories: [
        'Ne mogu pronaći određenu opciju',
        'Potrebna nova značajka',
        'Ostalo'
      ]
    },
    'performance': {
      label: 'Problem s performansama',
      subcategories: [
        'Aplikacija je spora',
        'Često se ruši',
        'Dugo učitavanje',
        'Ostalo'
      ]
    },
    'other': {
      label: 'Ostalo',
      subcategories: ['Drugi problem']
    }
  };

  const steps = [
    {
      title: 'Odaberi kategoriju problema',
      component: (
        <div className="category-selection">
          {Object.entries(problemCategories).map(([key, category]) => (
            <button
              key={key}
              className={`category-button ${formData.category === key ? 'selected' : ''}`}
              onClick={() => {
                setFormData(prev => ({
                  ...prev,
                  category: key,
                  subcategory: '' // Reset subcategory when category changes
                }));
              }}
            >
              <Icon 
                icon={getCategoryIcon(key)} 
                className="category-icon"
              />
              {category.label}
            </button>
          ))}
        </div>
      )
    },
    {
      title: 'Odaberi specifičan problem',
      component: formData.category && (
        <div className="subcategory-selection">
          {problemCategories[formData.category].subcategories.map((subcategory) => (
            <button
              key={subcategory}
              className={`subcategory-button ${formData.subcategory === subcategory ? 'selected' : ''}`}
              onClick={() => {
                setFormData(prev => ({
                  ...prev,
                  subcategory: subcategory
                }));
              }}
            >
              {subcategory}
            </button>
          ))}
        </div>
      )
    },
    {
      title: 'Opiši problem',
      component: (
        <div className="problem-description">
          <textarea
            className="description-input"
            placeholder="Detaljno opiši problem..."
            value={formData.description}
            onChange={(e) => {
              setFormData(prev => ({
                ...prev,
                description: e.target.value
              }));
            }}
            rows={6}
          />
          <textarea
            className="steps-input"
            placeholder="Koraci za reproduciranje problema (ako je primjenjivo)..."
            value={formData.steps}
            onChange={(e) => {
              setFormData(prev => ({
                ...prev,
                steps: e.target.value
              }));
            }}
            rows={4}
          />
        </div>
      )
    }
  ];

  function getCategoryIcon(category) {
    const icons = {
      login: 'solar:login-2-broken',
      functionality: 'solar:widget-broken',
      visual: 'solar:eye-broken',
      missing: 'solar:question-circle-broken',
      performance: 'solar:playback-speed-broken',
      other: 'solar:chat-round-dots-broken'
    };
    return icons[category] || 'solar:chat-round-dots-broken';
  }

  const handleSubmit = async () => {
    try {
      // Get browser and system info
      const deviceInfo = {
        userAgent: navigator.userAgent,
        screenSize: `${window.innerWidth}x${window.innerHeight}`,
        platform: navigator.platform,
        language: navigator.language,
        cookiesEnabled: navigator.cookieEnabled,
        isPWA: window.matchMedia('(display-mode: standalone)').matches
      };

      // Determine user role
      let userRole = 'Student';
      if (user.isAdmin) {
        userRole = 'Mentor-Admin';
      } else if (user.isMentor) {
        userRole = 'Mentor';
      }

      // Prepare data for email
      const supportForm = {
        subject: `[${problemCategories[formData.category].label}] ${formData.subcategory}`,
        message: `
Problem Description:
${formData.description}

Steps to Reproduce:
${formData.steps}

User Info:
- Name: ${user.ime} ${user.prezime}
- Email: ${user.email}
- Role: ${userRole}
- User ID: ${user.id}

Device Info:
- Browser: ${deviceInfo.userAgent}
- Screen Size: ${deviceInfo.screenSize}
- Platform: ${deviceInfo.platform}
- Language: ${deviceInfo.language}
- PWA: ${deviceInfo.isPWA ? 'Yes' : 'No'}

Current URL: ${window.location.href}
Previous URL: ${document.referrer}
Timestamp: ${new Date().toISOString()}
`
      };

      // Prepare data for error report storage
      const errorData = {
        category: formData.category,
        subcategory: formData.subcategory,
        description: formData.description,
        steps: formData.steps,
        userRole: userRole,
        userId: user.isMentor ? null : user.id,
        mentorId: user.isMentor ? user.id : null,
        userEmail: user.email,
        userAgent: deviceInfo.userAgent,
        url: window.location.href,
        previousUrl: document.referrer
      };

      // Send both requests in parallel
      await Promise.all([
        ApiConfig.api.post('/api/support', supportForm),
        ApiConfig.api.post('/api/error/report', { errorData })
      ]);

      // Track this as a feature usage
      await sendAnalytics('report_problem', {
        category: formData.category,
        subcategory: formData.subcategory,
        userRole: userRole,
        isPWA: deviceInfo.isPWA,
        platform: deviceInfo.platform
      });

      // Show success message and navigate back
      alert('Hvala na prijavi problema. Naš tim će ga pregledati što prije.');
      navigate(-1);
    } catch (error) {
      console.error('Error submitting problem report:', error);
      
      // Track failed submissions
      await sendAnalytics('report_problem_failed', {
        errorMessage: error.message,
        userRole: user.isAdmin ? 'Mentor-Admin' : (user.isMentor ? 'Mentor' : 'Student')
      });
      
      alert('Došlo je do greške pri slanju prijave. Molimo pokušajte ponovno.');
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return formData.category !== '';
      case 1:
        return formData.subcategory !== '';
      case 2:
        return formData.description.trim().length >= 10;
      default:
        return false;
    }
  };

  return (
    <div className="report-problem-container">
      <button
        onClick={() => navigate(-1)}
        className="back-button"
      >
        <Icon icon="solar:arrow-left-broken" />
        Natrag
      </button>

      <div className="report-problem-content">
        <h1>Prijavi problem</h1>
        
        <div className="steps-progress">
          {steps.map((step, index) => (
            <div 
              key={index}
              className={`step ${index === currentStep ? 'active' : ''} ${index < currentStep ? 'completed' : ''}`}
            >
              <div className="step-number">{index + 1}</div>
              <div className="step-title">{step.title}</div>
            </div>
          ))}
        </div>

        <div className="step-content">
          {steps[currentStep].component}
        </div>

        <div className="navigation-buttons">
          {currentStep > 0 && (
            <button
              className="nav-button back"
              onClick={() => setCurrentStep(prev => prev - 1)}
            >
              <Icon icon="solar:arrow-left-broken" />
              Natrag
            </button>
          )}
          
          {currentStep < steps.length - 1 ? (
            <button
              className="nav-button next"
              onClick={() => setCurrentStep(prev => prev + 1)}
              disabled={!canProceed()}
            >
              Dalje
              <Icon icon="solar:arrow-right-broken" />
            </button>
          ) : (
            <button
              className="nav-button submit"
              onClick={handleSubmit}
              disabled={!canProceed()}
            >
              Pošalji prijavu
              <Icon icon="solar:paper-plane-broken" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportProblem; 