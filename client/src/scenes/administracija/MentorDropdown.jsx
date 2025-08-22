import React, { useEffect, useState } from 'react';
import axios from 'axios';

const MentorDropdown = ({ onMentorSelect }) => {
  const [mentors, setMentors] = useState([]);

  useEffect(() => {
    const fetchMentors = async () => {
      try {
        const response = await axios.get('/api/mentori'); // Adjust the URL to match your API route
        setMentors(response.data);
      } catch (error) {
        console.error('Error fetching mentors:', error);
      }
    };

    fetchMentors();
  }, []);

  return (
    <select onChange={(e) => onMentorSelect(e.target.value)} className='opcije'>
      <option value="">Odaberi mentora</option>
      {mentors.map((mentor) => (
        <option key={mentor._id} value={mentor._id}>
          {mentor.korisnickoIme}
        </option>
      ))}
    </select>
  );
};

export default MentorDropdown;
