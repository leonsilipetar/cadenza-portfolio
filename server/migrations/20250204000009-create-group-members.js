'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if GroupMembers table exists
    const tables = await queryInterface.sequelize.query(
      'SELECT table_name FROM information_schema.tables WHERE table_name = \'GroupMembers\'',
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (tables.length === 0) {
      // Create the GroupMembers junction table
      await queryInterface.createTable('GroupMembers', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        groupId: {
          type: Sequelize.INTEGER,
          references: { model: 'Group', key: 'id' },
          onDelete: 'CASCADE'
        },
        userId: {
          type: Sequelize.INTEGER,
          references: { model: 'User', key: 'id' },
          onDelete: 'CASCADE',
          allowNull: true
        },
        mentorId: {
          type: Sequelize.INTEGER,
          references: { model: 'Mentor', key: 'id' },
          onDelete: 'CASCADE',
          allowNull: true
        },
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false }
      });

      // Add indexes for better performance
      await queryInterface.addIndex('GroupMembers', ['groupId']);
      await queryInterface.addIndex('GroupMembers', ['userId']);
      await queryInterface.addIndex('GroupMembers', ['mentorId']);
    }

    // Check if adminId exists in Group table
    const groupTableInfo = await queryInterface.describeTable('Group');
    if (!groupTableInfo.adminId) {
      // First add the column as nullable
      await queryInterface.addColumn('Group', 'adminId', {
        type: Sequelize.INTEGER,
        references: { model: 'Mentor', key: 'id' },
        allowNull: true
      });

      // Get the first mentor to use as default admin
      const [mentors] = await queryInterface.sequelize.query(
        'SELECT id FROM "Mentor" LIMIT 1'
      );

      if (mentors.length > 0) {
        const defaultAdminId = mentors[0].id;
        
        // Update existing groups with the default admin
        await queryInterface.sequelize.query(
          'UPDATE "Group" SET "adminId" = :adminId WHERE "adminId" IS NULL',
          {
            replacements: { adminId: defaultAdminId },
            type: Sequelize.QueryTypes.UPDATE
          }
        );

        // Now make the column non-nullable
        await queryInterface.changeColumn('Group', 'adminId', {
          type: Sequelize.INTEGER,
          references: { model: 'Mentor', key: 'id' },
          allowNull: false
        });
      }
    }

    // Remove the old members array column if it exists
    if (groupTableInfo.members) {
      await queryInterface.removeColumn('Group', 'members');
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Drop the junction table if it exists
    const tables = await queryInterface.sequelize.query(
      'SELECT table_name FROM information_schema.tables WHERE table_name = \'GroupMembers\'',
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (tables.length > 0) {
      await queryInterface.dropTable('GroupMembers');
    }

    // Add back the members array column
    await queryInterface.addColumn('Group', 'members', {
      type: Sequelize.ARRAY(Sequelize.INTEGER),
      defaultValue: []
    });

    // Remove adminId column if it exists
    const groupTableInfo = await queryInterface.describeTable('Group');
    if (groupTableInfo.adminId) {
      await queryInterface.removeColumn('Group', 'adminId');
    }
  }
}; 