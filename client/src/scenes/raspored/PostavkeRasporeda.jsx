import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import ApiConfig from '../../components/apiConfig';
import { toast } from 'react-toastify';
import moment from 'moment';
import 'moment/locale/hr';

const PostavkeRasporeda = ({ onClose, user }) => {
  const [currentWeek, setCurrentWeek] = useState(null);
  const [weekDates, setWeekDates] = useState([]);

  useEffect(() => {
    // Get current week's dates
    const today = moment();
    const monday = today.clone().startOf('isoWeek');
    const dates = [];
    
    for (let i = 0; i < 7; i++) {
      dates.push(monday.clone().add(i, 'days'));
    }
    setWeekDates(dates);

    // Fetch current week type
    fetchCurrentWeekType();
  }, []);

  const fetchCurrentWeekType = async () => {
    try {
      const response = await ApiConfig.api.get('/api/schedule/week-type');
      setCurrentWeek(response.data.weekType);
    } catch (error) {
      console.error('Error fetching week type:', error);
      toast.error('Greška pri dohvaćanju tipa tjedna');
    }
  };

  const handleSetWeekType = async (type) => {
    try {
      await ApiConfig.api.post('/api/schedule/set-week-type', {
        weekType: type,
        date: moment().format('YYYY-MM-DD')
      });
      setCurrentWeek(type);
      toast.success(`Uspješno postavljen ${type} tjedan`);
    } catch (error) {
      console.error('Error setting week type:', error);
      toast.error('Greška pri postavljanju tipa tjedna');
    }
  };

  return (
    <div className="popup">
      <div className="div div-clmn">
        <h2>Postavke rasporeda</h2>
        
        {/* Week Type Selection */}
        <div className="div div-clmn">
          <h3>Odabir tjedna</h3>
          <div className="week-dates">
            {weekDates.map((date, index) => (
              <div key={index} className="date-item">
                <span>{date.format('ddd, D.M.')}</span>
              </div>
            ))}
          </div>
          <div className="notification-filters">
            <button
              className={`filter-btn ${currentWeek === 'A' ? 'active' : ''}`}
              onClick={() => handleSetWeekType('A')}
            >
              A tjedan
            </button>
            <button
              className={`filter-btn ${currentWeek === 'B' ? 'active' : ''}`}
              onClick={() => handleSetWeekType('B')}
            >
              B tjedan
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            {currentWeek ? 
              `Trenutni tjedan je ${currentWeek} tjedan. Sljedeći tjedan će biti ${currentWeek === 'A' ? 'B' : 'A'} tjedan.` :
              'Odaberite tip trenutnog tjedna'}
          </p>
        </div>

        <div className="div-radio">
          <button className="gumb action-btn zatvoriBtn" onClick={onClose}>
            Zatvori
          </button>
        </div>
      </div>
    </div>
  );
};

export default PostavkeRasporeda; 