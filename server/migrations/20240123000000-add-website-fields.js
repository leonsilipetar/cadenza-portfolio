'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add website fields to Mentor table
    await queryInterface.addColumn('Mentor', 'kratakOpis', {
      type: Sequelize.STRING(500),
      allowNull: true,
      comment: 'Short description for mentor displayed on website'
    });
    
    await queryInterface.addColumn('Mentor', 'opis', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Full description/content with rich text for mentor profile on website'
    });
    
    await queryInterface.addColumn('Mentor', 'showOnWeb', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      comment: 'Flag to control visibility on website'
    });
    
    // Add website fields to Program table
    await queryInterface.addColumn('Program', 'kratakOpis', {
      type: Sequelize.STRING(500),
      allowNull: true,
      comment: 'Short description for program displayed on website'
    });
    
    await queryInterface.addColumn('Program', 'showOnWeb', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      comment: 'Flag to control visibility on website'
    });
    
    // Add website fields to School table
    await queryInterface.addColumn('School', 'radnoVrijeme', {
      type: Sequelize.JSONB,
      defaultValue: {
        ponedjeljak: { od: '09:00', do: '20:00' },
        utorak: { od: '09:00', do: '20:00' },
        srijeda: { od: '09:00', do: '20:00' },
        cetvrtak: { od: '09:00', do: '20:00' },
        petak: { od: '09:00', do: '20:00' },
        subota: { od: '09:00', do: '13:00' },
        nedjelja: { od: null, do: null }
      },
      comment: 'Working hours of the school'
    });
    
    await queryInterface.addColumn('School', 'kontaktInfo', {
      type: Sequelize.JSONB,
      defaultValue: {
        telefon: null,
        email: null,
        facebook: null,
        instagram: null,
        youtube: null
      },
      comment: 'Contact information for the school'
    });
    
    await queryInterface.addColumn('School', 'webOpis', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Description of the school for the website'
    });
    
    await queryInterface.addColumn('School', 'webEnabled', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      comment: 'Whether the school has a website enabled'
    });
    
    await queryInterface.addColumn('School', 'webSettings', {
      type: Sequelize.JSONB,
      defaultValue: {
        primaryColor: '#007bff',
        secondaryColor: '#6c757d',
        logo: null,
        favicon: null,
        heroImage: null
      },
      comment: 'Website configuration settings'
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove website fields from Mentor table
    await queryInterface.removeColumn('Mentor', 'kratakOpis');
    await queryInterface.removeColumn('Mentor', 'opis');
    await queryInterface.removeColumn('Mentor', 'showOnWeb');
    
    // Remove website fields from Program table
    await queryInterface.removeColumn('Program', 'kratakOpis');
    await queryInterface.removeColumn('Program', 'showOnWeb');
    
    // Remove website fields from School table
    await queryInterface.removeColumn('School', 'radnoVrijeme');
    await queryInterface.removeColumn('School', 'kontaktInfo');
    await queryInterface.removeColumn('School', 'webOpis');
    await queryInterface.removeColumn('School', 'webEnabled');
    await queryInterface.removeColumn('School', 'webSettings');
  }
}; 