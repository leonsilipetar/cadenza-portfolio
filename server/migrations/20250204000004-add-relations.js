'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {

    // Add relations to User
    await queryInterface.addColumn('User', 'schoolId', {
      type: Sequelize.INTEGER,
      references: { model: 'School', key: 'id' }
    });

    await queryInterface.addColumn('User', 'mentorId', {
      type: Sequelize.INTEGER,
      references: { model: 'Mentor', key: 'id' },
      allowNull: true
    });
    await queryInterface.addColumn('User', 'programId', {
      type: Sequelize.INTEGER,
      references: { model: 'Program', key: 'id' },
      allowNull: true
    });
    await queryInterface.addColumn('User', 'rasporedId', {
      type: Sequelize.INTEGER,
      references: { model: 'Raspored', key: 'id' },
      allowNull: true
    });
    await queryInterface.addColumn('User', 'rasporedTeorijaId', {
      type: Sequelize.INTEGER,
      references: { model: 'RasporedTeorija', key: 'id' },
      allowNull: true
    });

    // Add relations to Mentor
    await queryInterface.addColumn('Mentor', 'schoolId', {
      type: Sequelize.INTEGER,
      references: { model: 'School', key: 'id' }
    });

    await queryInterface.addColumn('Mentor', 'programId', {
      type: Sequelize.INTEGER,
      references: { model: 'Program', key: 'id' },
      allowNull: true
    });

    // Add relations to Message
    await queryInterface.addColumn('Message', 'schoolId', {
      type: Sequelize.INTEGER,
      references: { model: 'School', key: 'id' }
    });

    // Add relations to Notification
    await queryInterface.addColumn('Notification', 'userId', {
      type: Sequelize.INTEGER,
      references: { model: 'User', key: 'id' }
    });
    await queryInterface.addColumn('Notification', 'schoolId', {
      type: Sequelize.INTEGER,
      references: { model: 'School', key: 'id' }
    });

    // Add relations to InvoiceSettings
    await queryInterface.addColumn('InvoiceSettings', 'schoolId', {
      type: Sequelize.INTEGER,
      references: { model: 'School', key: 'id' }
    });

    // Add relations to Invoice
    await queryInterface.addColumn('Invoice', 'userId', {
      type: Sequelize.INTEGER,
      references: { model: 'User', key: 'id' }
    });
    await queryInterface.addColumn('Invoice', 'schoolId', {
      type: Sequelize.INTEGER,
      references: { model: 'School', key: 'id' }
    });

    // Add relations to Group
    await queryInterface.addColumn('Group', 'schoolId', {
      type: Sequelize.INTEGER,
      references: { model: 'School', key: 'id' }
    });

    // Add relations to Post
    await queryInterface.addColumn('Post', 'authorId', {
      type: Sequelize.INTEGER,
      references: { model: 'User', key: 'id' }
    });
    await queryInterface.addColumn('Post', 'schoolId', {
      type: Sequelize.INTEGER,
      references: { model: 'School', key: 'id' }
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove Post relations
    await queryInterface.removeColumn('Post', 'schoolId');
    await queryInterface.removeColumn('Post', 'authorId');

    // Remove Group relations
    await queryInterface.removeColumn('Group', 'schoolId');

    // Remove Invoice relations
    await queryInterface.removeColumn('Invoice', 'schoolId');
    await queryInterface.removeColumn('Invoice', 'userId');

    // Remove InvoiceSettings relations
    await queryInterface.removeColumn('InvoiceSettings', 'schoolId');

    // Remove Notification relations
    await queryInterface.removeColumn('Notification', 'schoolId');
    await queryInterface.removeColumn('Notification', 'userId');

    // Remove Message relations
    await queryInterface.removeColumn('Message', 'schoolId');

    // Remove Mentor relations
    await queryInterface.removeColumn('Mentor', 'programId');
    await queryInterface.removeColumn('Mentor', 'schoolId');

    // Remove User relations
    await queryInterface.removeColumn('User', 'rasporedTeorijaId');
    await queryInterface.removeColumn('User', 'rasporedId');
    await queryInterface.removeColumn('User', 'programId');
    await queryInterface.removeColumn('User', 'mentorId');
    await queryInterface.removeColumn('User', 'schoolId');
  }
};