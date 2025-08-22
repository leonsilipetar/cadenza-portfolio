'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. First add the column as nullable
    await queryInterface.addColumn('PendingUsers', 'schoolId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'School',
        key: 'id'
      }
    });

    // 2. Get the first active school's ID to use as default
    const [schools] = await queryInterface.sequelize.query(
      `SELECT id FROM "School" WHERE active = true LIMIT 1;`
    );
    const defaultSchoolId = schools[0]?.id;

    if (defaultSchoolId) {
      // 3. Update existing records with the default schoolId
      await queryInterface.sequelize.query(
        `UPDATE "PendingUsers" SET "schoolId" = :schoolId WHERE "schoolId" IS NULL`,
        {
          replacements: { schoolId: defaultSchoolId }
        }
      );

      // 4. Now make the column non-nullable
      await queryInterface.changeColumn('PendingUsers', 'schoolId', {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'School',
          key: 'id'
        }
      });
    }

    // 5. Add index for schoolId
    await queryInterface.addIndex('PendingUsers', ['schoolId']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('PendingUsers', 'schoolId');
  }
}; 