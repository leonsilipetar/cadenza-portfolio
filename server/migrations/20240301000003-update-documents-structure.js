'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add new columns to Documents table
    await queryInterface.addColumn('Documents', 'creatorName', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'Unknown' // temporary default value
    });

    await queryInterface.addColumn('Documents', 'sharedToIds', {
      type: Sequelize.ARRAY(Sequelize.INTEGER),
      defaultValue: []
    });

    // Copy data from DocumentShares to sharedToIds
    const documents = await queryInterface.sequelize.query(
      'SELECT "documentId", array_agg("userId") as "sharedToIds" FROM "DocumentShares" GROUP BY "documentId"',
      { type: Sequelize.QueryTypes.SELECT }
    );

    // Update each document with its sharedToIds
    for (const doc of documents) {
      await queryInterface.sequelize.query(
        'UPDATE "Documents" SET "sharedToIds" = :sharedToIds WHERE id = :docId',
        {
          replacements: {
            sharedToIds: doc.sharedToIds,
            docId: doc.documentId
          },
          type: Sequelize.QueryTypes.UPDATE
        }
      );
    }

    // Update creatorName for each document
    await queryInterface.sequelize.query(`
      UPDATE "Documents" d
      SET "creatorName" = m.ime || ' ' || m.prezime
      FROM "Mentor" m
      WHERE d."creatorId" = m.id
    `);

    // Drop DocumentShares table
    await queryInterface.dropTable('DocumentShares');
  },

  async down(queryInterface, Sequelize) {
    // Recreate DocumentShares table
    await queryInterface.createTable('DocumentShares', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      documentId: {
        type: Sequelize.INTEGER,
        references: {
          model: 'Documents',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      userId: {
        type: Sequelize.INTEGER,
        references: {
          model: 'Mentor',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Copy data back from sharedToIds to DocumentShares
    const documents = await queryInterface.sequelize.query(
      'SELECT id, "sharedToIds" FROM "Documents" WHERE "sharedToIds" IS NOT NULL AND array_length("sharedToIds", 1) > 0',
      { type: Sequelize.QueryTypes.SELECT }
    );

    for (const doc of documents) {
      for (const userId of doc.sharedToIds) {
        await queryInterface.sequelize.query(
          'INSERT INTO "DocumentShares" ("documentId", "userId", "createdAt", "updatedAt") VALUES (:docId, :userId, NOW(), NOW())',
          {
            replacements: {
              docId: doc.id,
              userId: userId
            },
            type: Sequelize.QueryTypes.INSERT
          }
        );
      }
    }

    // Remove new columns from Documents table
    await queryInterface.removeColumn('Documents', 'sharedToIds');
    await queryInterface.removeColumn('Documents', 'creatorName');
  }
}; 