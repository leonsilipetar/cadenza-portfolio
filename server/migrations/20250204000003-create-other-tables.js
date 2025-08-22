'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. RasporedTeorija
    await queryInterface.createTable('RasporedTeorija', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      pon: { type: Sequelize.JSONB, defaultValue: [] },
      uto: { type: Sequelize.JSONB, defaultValue: [] },
      sri: { type: Sequelize.JSONB, defaultValue: [] },
      cet: { type: Sequelize.JSONB, defaultValue: [] },
      pet: { type: Sequelize.JSONB, defaultValue: [] },
      sub: { type: Sequelize.JSONB, defaultValue: [] },
      ned: { type: Sequelize.JSONB, defaultValue: [] },
      active: { type: Sequelize.BOOLEAN, defaultValue: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });

    // 2. Raspored
    await queryInterface.createTable('Raspored', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      pon: { type: Sequelize.JSONB, defaultValue: [] },
      uto: { type: Sequelize.JSONB, defaultValue: [] },
      sri: { type: Sequelize.JSONB, defaultValue: [] },
      cet: { type: Sequelize.JSONB, defaultValue: [] },
      pet: { type: Sequelize.JSONB, defaultValue: [] },
      sub: { type: Sequelize.JSONB, defaultValue: [] },
      ned: { type: Sequelize.JSONB, defaultValue: [] },
      active: { type: Sequelize.BOOLEAN, defaultValue: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });

    // 3. Chat
    await queryInterface.createTable('Chat', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      name: { type: Sequelize.STRING },
      type: { type: Sequelize.STRING },
      participants: { type: Sequelize.ARRAY(Sequelize.INTEGER) },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });

    // 4. Message
    await queryInterface.createTable('Message', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      senderId: { type: Sequelize.INTEGER, allowNull: false },
      senderType: { type: Sequelize.STRING, allowNull: false },
      recipientId: { type: Sequelize.INTEGER, allowNull: false },
      chatId: { type: Sequelize.STRING, allowNull: false },
      text: { type: Sequelize.TEXT, allowNull: false },
      type: { type: Sequelize.STRING, defaultValue: 'text' },
      read: { type: Sequelize.BOOLEAN, defaultValue: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });

    // 5. Notification
    await queryInterface.createTable('Notification', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      title: { type: Sequelize.STRING },
      message: { type: Sequelize.TEXT },
      type: { type: Sequelize.STRING },
      read: { type: Sequelize.BOOLEAN, defaultValue: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });

    // 6. InvoiceSettings
    await queryInterface.createTable('InvoiceSettings', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      naziv: { type: Sequelize.STRING },
      adresa: { type: Sequelize.STRING },
      mjesto: { type: Sequelize.STRING },
      oib: { type: Sequelize.STRING },
      iban: { type: Sequelize.STRING },
      banka: { type: Sequelize.STRING },
      swift: { type: Sequelize.STRING },
      napomena: { type: Sequelize.TEXT },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });

    // 7. Invoice
    await queryInterface.createTable('Invoice', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      broj: { type: Sequelize.STRING },
      datum: { type: Sequelize.DATE },
      datumDospijeca: { type: Sequelize.DATE },
      datumIsporuke: { type: Sequelize.DATE },
      mjestoIzdavanja: { type: Sequelize.STRING },
      nazivUsluge: { type: Sequelize.STRING },
      kolicina: { type: Sequelize.INTEGER },
      cijena: { type: Sequelize.DECIMAL(10, 2) },
      popust: { type: Sequelize.DECIMAL(10, 2) },
      ukupno: { type: Sequelize.DECIMAL(10, 2) },
      napomena: { type: Sequelize.TEXT },
      placeno: { type: Sequelize.BOOLEAN, defaultValue: false },
      storno: { type: Sequelize.BOOLEAN, defaultValue: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });

    // 8. Group
    await queryInterface.createTable('Group', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      name: { type: Sequelize.STRING },
      description: { type: Sequelize.TEXT },
      members: { type: Sequelize.ARRAY(Sequelize.INTEGER) },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });

    // 9. Post
    await queryInterface.createTable('Post', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      title: { type: Sequelize.STRING },
      content: { type: Sequelize.TEXT },
      type: { type: Sequelize.STRING },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Post');
    await queryInterface.dropTable('Group');
    await queryInterface.dropTable('Invoice');
    await queryInterface.dropTable('InvoiceSettings');
    await queryInterface.dropTable('Notification');
    await queryInterface.dropTable('Message');
    await queryInterface.dropTable('Chat');
    await queryInterface.dropTable('Raspored');
    await queryInterface.dropTable('RasporedTeorija');
  }
}; 