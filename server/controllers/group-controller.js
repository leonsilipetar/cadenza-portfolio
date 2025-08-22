const { Group, User, Message, Mentor, sequelize, Sequelize } = require('../models');
const asyncWrapper = require("../middleware/asyncWrapper.js");
const { createNotification } = require('./notification-controller');
const Op = Sequelize.Op;

// Create a new group chat
const createGroup = asyncWrapper(async (req, res) => {
    try {
        console.log('Raw group creation request body:', JSON.stringify(req.body));
        
        const { name, description, userIds } = req.body;
        const adminId = req.user.id;
        const schoolId = req.user.schoolId;

        console.log('Creating group:', { 
            name, 
            description, 
            userIds: userIds || 'none', 
            adminId, 
            schoolId 
        });

        if (!req.user.isMentor) {
            return res.status(403).json({ message: 'Only mentors can create group chats' });
        }

        // Validate input
        if (!name || name.trim() === '') {
            return res.status(400).json({ message: 'Group name is required' });
        }

        // Validate user IDs
        let validUserIds = [];
        if (userIds && userIds.length > 0) {
            console.log('Processing userIds:', userIds);
            
            // Convert all values to integers
            const processedUserIds = userIds.map(id => {
                if (typeof id === 'string') {
                    const parsed = parseInt(id, 10);
                    if (isNaN(parsed)) {
                        console.warn(`Invalid user ID: "${id}" is not a number`);
                        return null;
                    }
                    return parsed;
                }
                return id;
            }).filter(id => id !== null && id > 0);
            
            console.log('Processed userIds:', processedUserIds);
            
            if (processedUserIds.length > 0) {
                // Find valid students from the same school
                const foundUsers = await User.findAll({
                    where: {
                        id: { [Op.in]: processedUserIds },
                        isStudent: true,
                        schoolId
                    },
                    attributes: ['id']
                });
                
                validUserIds = foundUsers.map(user => user.id);
                console.log(`Found ${validUserIds.length} valid users out of ${processedUserIds.length} requested`);
            }
        }

        // Create the group
        console.log('Creating group with:', {
            name,
            description,
            adminId,
            schoolId,
            validUserIds
        });

        const newGroup = await Group.create({
            name,
            description,
            adminId,
            schoolId
        });

        console.log('Group created with ID:', newGroup.id);

        // Add user members
        if (validUserIds.length > 0) {
            console.log(`Adding ${validUserIds.length} user members`);
            
            try {
                await sequelize.transaction(async (t) => {
                    // Use the correct table name directly
                    const userJunctionTable = 'GroupUserMembers';
                    console.log(`Using user junction table: ${userJunctionTable}`);
                    
                    for (const userId of validUserIds) {
                        await sequelize.query(
                            `INSERT INTO "${userJunctionTable}" ("groupId", "userId", "createdAt", "updatedAt") VALUES (?, ?, NOW(), NOW())`,
                            {
                                replacements: [newGroup.id, userId],
                                type: sequelize.QueryTypes.INSERT,
                                transaction: t
                            }
                        );
                    }
                });
                console.log(`Added ${validUserIds.length} users to the group`);
            } catch (error) {
                console.error('Error adding user members:', error);
                // Continue despite errors to return the group
            }
        }

        // Fetch the complete group with all members
        console.log('Fetching group with members...');
        const groupWithMembers = await Group.findByPk(newGroup.id, {
            include: [
                {
                    model: User,
                    as: 'members',
                    attributes: ['id', 'ime', 'prezime', 'email']
                },
                {
                    model: Mentor,
                    as: 'admin',
                    attributes: ['id', 'ime', 'prezime', 'email']
                }
            ]
        });

        // Send notifications to all members
        try {
            console.log('Sending notifications to group members...');
            const admin = await Mentor.findByPk(adminId);
            
            if (admin) {
                const adminName = `${admin.ime} ${admin.prezime}`;

                // Create notifications for all members
                for (const userId of validUserIds) {
                    try {
                        await createNotification({
                            userId,
                            type: 'group',
                            title: `Dodan u grupu ${name}`,
                            message: `${adminName} vas je dodao/la u grupu: ${name}`,
                            groupId: newGroup.id,
                            senderId: adminId,
                            senderType: 'Mentor',
                            isPublic: false
                        });
                        console.log(`Notification sent to user ${userId}`);
                    } catch (err) {
                        console.error(`Error creating notification for user ${userId}:`, err);
                    }
                }
            }
        } catch (notificationError) {
            console.error('Error sending notifications:', notificationError);
            // Continue despite notification errors
        }

        console.log('Group creation completed successfully with ID:', newGroup.id);
        return res.status(201).json(groupWithMembers);
    } catch (error) {
        console.error('Error creating group:', error);
        return res.status(500).json({ message: 'Error creating group', error: error.message });
    }
});

// Get all groups for the current user
const getGroups = async (req, res) => {
  try {
    console.log('Request headers:', req.headers);
    console.log('Request user:', req.user);
    
    if (!req.user) {
      console.log('No user found in request');
      return res.status(401).json({ message: 'Authentication required' });
    }

    const userId = req.user.id;
    const isMentor = req.user.isMentor;

    console.log('Fetching groups for user:', { userId, isMentor });

    // Find all groups where the user is either a member or an admin
    const groups = await Group.findAll({
      include: [
        {
          model: User,
          as: 'members',
          through: { attributes: [] },
          attributes: ['id', 'ime', 'prezime', 'email']
        },
        {
          model: Mentor,
          as: 'mentorMembers',
          through: { attributes: [] },
          attributes: ['id', 'ime', 'prezime', 'email']
        },
        {
          model: Mentor,
          as: 'admin',
          attributes: ['id', 'ime', 'prezime', 'email']
        }
      ],
      where: isMentor ? {
        [Op.or]: [
          { adminId: userId },
          { '$mentorMembers.id$': userId }
        ]
      } : {
        '$members.id$': userId
      }
    });

    console.log('Found groups:', groups.length);
    console.log('Groups data:', JSON.stringify(groups, null, 2));

    res.json(groups);
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ message: 'Error fetching groups', error: error.message });
  }
};

// Get messages for a specific group
const getGroupMessages = asyncWrapper(async (req, res) => {
    const { groupId } = req.params;
    const userId = req.user.id;
    const isMentor = req.user.isMentor;

    // Check if user is a member of the group
    const group = await Group.findOne({
        where: {
            id: groupId,
            [Op.or]: [
                { '$members.id$': userId },
                { '$mentorMembers.id$': userId },
                { adminId: userId }
            ]
        },
        include: [
            {
                model: User,
                as: 'members',
                attributes: ['id', 'ime', 'prezime']
            },
            {
                model: Mentor,
                as: 'mentorMembers',
                attributes: ['id', 'ime', 'prezime']
            },
            {
                model: Mentor,
                as: 'admin',
                attributes: ['id', 'ime', 'prezime']
            }
        ]
    });

    if (!group) {
        return res.status(403).json({ message: 'Access denied' });
    }

    const messages = await Message.findAll({
        where: { groupId },
        include: [
            {
                model: User,
                as: 'sender',
                attributes: ['id', 'ime', 'prezime'],
                required: false
            },
            {
                model: Mentor,
                as: 'senderMentor',
                attributes: ['id', 'ime', 'prezime'],
                required: false
            },
            {
                model: Message,
                as: 'replyTo',
                include: [
                    {
                        model: User,
                        as: 'sender',
                        attributes: ['id', 'ime', 'prezime'],
                        required: false
                    },
                    {
                        model: Mentor,
                        as: 'senderMentor',
                        attributes: ['id', 'ime', 'prezime'],
                        required: false
                    }
                ]
            }
        ],
        order: [['createdAt', 'ASC']]
    });

    // Process messages to ensure correct sender information
    const processedMessages = await Promise.all(messages.map(async (message) => {
        const messageJson = message.toJSON();
        
        if (messageJson.senderType === 'User' && messageJson.senderId) {
            messageJson.sender = await User.findByPk(messageJson.senderId, {
                attributes: ['id', 'ime', 'prezime']
            });
            messageJson.senderMentor = null;
        } else if (messageJson.senderType === 'Mentor' && messageJson.senderMentorId) {
            messageJson.senderMentor = await Mentor.findByPk(messageJson.senderMentorId, {
                attributes: ['id', 'ime', 'prezime']
            });
            messageJson.sender = null;
        }
        
        return messageJson;
    }));

    res.json(processedMessages);
});

// Add members to a group
const addGroupMembers = asyncWrapper(async (req, res) => {
    const { groupId } = req.params;
    const { userIds, mentorIds } = req.body;
    const adminId = req.user.id;

    // Check if user is admin of the group
    const group = await Group.findOne({
        where: {
            id: groupId,
            adminId
        }
    });

    if (!group) {
        return res.status(403).json({ message: 'Only group admin can add members' });
    }

    // Add new members
    if (userIds && userIds.length > 0) {
        await group.addMembers(userIds);
    }
    if (mentorIds && mentorIds.length > 0) {
        await group.addMentorMembers(mentorIds);
    }

    // Send notifications to new members
    const admin = await Mentor.findByPk(adminId);
    const adminName = `${admin.ime} ${admin.prezime}`;

    if (userIds) {
        for (const userId of userIds) {
            await createNotification({
                userId,
                type: 'group',
                title: 'Dodan u grupu',
                message: `${adminName} vas je dodao/la u grupu: ${group.name}`,
                groupId: group.id,
                senderId: adminId,
                senderType: 'Mentor',
                isPublic: false
            });
        }
    }

    if (mentorIds) {
        for (const mentorId of mentorIds) {
            await createNotification({
                mentorId,
                type: 'group',
                title: 'Dodan u grupu',
                message: `${adminName} vas je dodao/la u grupu: ${group.name}`,
                groupId: group.id,
                senderId: adminId,
                senderType: 'Mentor',
                isPublic: false
            });
        }
    }

    res.json({ message: 'Members added successfully' });
});

// Remove members from a group
const removeGroupMembers = asyncWrapper(async (req, res) => {
    const { groupId } = req.params;
    const { userIds, mentorIds } = req.body;
    const adminId = req.user.id;

    // Check if user is admin of the group
    const group = await Group.findOne({
        where: {
            id: groupId,
            adminId
        }
    });

    if (!group) {
        return res.status(403).json({ message: 'Only group admin can remove members' });
    }

    // Remove members
    if (userIds && userIds.length > 0) {
        await group.removeMembers(userIds);
    }
    if (mentorIds && mentorIds.length > 0) {
        await group.removeMentorMembers(mentorIds);
    }

    res.json({ message: 'Members removed successfully' });
});

// Delete a group
const deleteGroup = asyncWrapper(async (req, res) => {
    const { groupId } = req.params;
    const adminId = req.user.id;

    // Check if user is admin of the group
    const group = await Group.findOne({
        where: {
            id: groupId,
            adminId
        }
    });

    if (!group) {
        return res.status(403).json({ message: 'Only group admin can delete the group' });
    }

    // Delete all messages in the group first
    await Message.destroy({
        where: { groupId }
    });

    // Delete the group (this will automatically remove entries from junction tables)
    await group.destroy();

    res.json({ message: 'Group deleted successfully' });
});

module.exports = {
    createGroup,
    getGroups,
    getGroupMessages,
    addGroupMembers,
    removeGroupMembers,
    deleteGroup
}; 