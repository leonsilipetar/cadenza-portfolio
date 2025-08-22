const schedule = require('node-schedule');
const { User, Raspored, RasporedTeorija, Notification } = require('../models');
const { admin } = require('../firebase-admin');
const { DateTime } = require('luxon');

const reminderMessages = [
  "🎵 Hej! Tvoj instrument te zove! Vrijeme je za vježbu!",
  "🎼 Ne daj da tvoj talent skuplja prašinu — vježbaj malo!",
  "🎹 Glazbena avantura te čeka — svirajmo nešto!",
  "🎸 Vježbom do savršenstva! Spreman/na za današnju sesiju?",
  "🎺 Sljedeći sat se bliži! Vrijeme je da zablistaš!",
  "🎻 Fale nam tvoje melodije! Vrijeme je za vježbanje!",
  "🥁 Ritam te čeka — nemoj ga pustiti da čeka predugo!",
  "🎶 Novi dan, nova prilika da budeš fantastičan/na!",

  // Dodatne poruke:
  "🎼 Ne zaboravi — svaki ton koji odsviraš te čini boljim/om!",
  "🎶 Glazba ne spava! A ni tvoje vještine ne bi trebale!",
  "🎷 Tvoj instrument je malo usamljen. Možda da ga razveseliš?",
  "🎹 Samo pet minuta vježbe danas = veliki napredak sutra!",
  "🎻 Tvoj profesor će biti sretan, a i ti kad odsviraš kao šef!",
  "🥁 Isprobaj onaj dio koji ti ide najgore – pa nek postane najbolji!",
  "🎺 Glazba liječi sve – i dosadu i tremu. Sviraj!",
  "🎸 Ako ne sviraš danas, sutra ćeš reći: 'Zašto nisam?'",
  "🎹 Uhvati dobar groove – tvoj instrument zna da možeš!",
  "🎼 Vježbanje ne mora biti dosadno. Uključi timer i pretvori to u igru!",
  "🎶 Nema lošeg dana za malo glazbe!",
  "🎻 Čak i deset minuta vrijedi. Sviraj nešto za sebe!",
  "🎺 Tko zna, možda tvoj današnji trud postane sutrašnji koncert!",
  "🎸 Hej, rock zvijezdo! Sjeti se svojih snova – kreni svirati!",
  "🎼 Možda ti se sad ne da, ali bit ćeš si zahvalan/na kasnije.",
  "🎹 Tvoj instrument te gleda. I pita se — gdje si ti?",
  "🎶 Vježbanje danas = aplauz sutra!",
  "🎻 Budi ponosan/na na svaki ton – čak i kad škripi!",
  "🎺 Ovaj podsjetnik ti ne može svirati umjesto tebe... ali može te gurnuti!"
];

const getRandomMessage = () => {
  return reminderMessages[Math.floor(Math.random() * reminderMessages.length)];
};

// Send practice reminder
const sendPracticeReminder = async (user) => {
  if (!user.fcmToken) return;

  const message = getRandomMessage();
  try {
    const messagePayload = {
      token: user.fcmToken,
      notification: {
        title: "Time to Practice! 🎵",
        body: message
      },
      webpush: {
        headers: {
          Urgency: "high"
        },
        notification: {
          title: "Time to Practice! 🎵",
          body: message,
          icon: '/logo192.png',
          badge: '/logo192.png',
          vibrate: [100, 50, 100],
          data: {
            url: '/raspored'
          }
        },
        fcmOptions: {
          link: '/raspored'
        }
      }
    };

    await admin.messaging().send(messagePayload);

    // Create in-app notification
    await Notification.create({
      userId: user.id,
      title: "Practice Reminder",
      message,
      type: 'reminder',
      read: false
    });
  } catch (error) {
    console.error('Error sending practice reminder:', error);
  }
};

// Send class reminder
const sendClassReminder = async (user, classTime, type = 'regular') => {
  if (!user.fcmToken) return;

  let message;
  if (type === 'day_before') {
    message = "Sutra imaš nastavu! 🎵";
  } else if (type === 'hour_before') {
    message = "Nastava počinje za sat vremena! 🎼";
  } else {
    message = `Nastava počinje u ${classTime}! 🎵`;
  }

  try {
    const messagePayload = {
      token: user.fcmToken,
      notification: {
        title: "Podsjetnik za nastavu! 🎼",
        body: message
      },
      webpush: {
        headers: {
          Urgency: "high"
        },
        notification: {
          title: "Podsjetnik za nastavu! 🎼",
          body: message,
          icon: '/logo192.png',
          badge: '/logo192.png',
          vibrate: [100, 50, 100],
          data: {
            url: '/raspored'
          }
        },
        fcmOptions: {
          link: '/raspored'
        }
      }
    };

    await admin.messaging().send(messagePayload);

    await Notification.create({
      userId: user.id,
      title: "Podsjetnik za nastavu",
      message,
      type: 'class_reminder',
      read: false
    });
  } catch (error) {
    console.error('Error sending class reminder:', error);
  }
};

// Schedule daily practice reminders
const schedulePracticeReminders = async () => {
  // Check every minute for users who should receive reminders
  schedule.scheduleJob('* * * * *', async () => {
    const users = await User.findAll({
      where: { 
        isStudent: true,
        reminderPreferences: {
          practiceReminders: true
        }
      },
      include: [{
        model: Raspored,
        as: 'raspored'
      }]
    });

    const now = DateTime.now().setZone('Europe/Zagreb');
    const currentHour = now.hour;
    const currentMinute = now.minute;

    for (const user of users) {
      const reminderTime = user.reminderPreferences?.reminderTime || '14:00';
      const [preferredHour, preferredMinute] = reminderTime.split(':').map(Number);

      // Check if it's the user's preferred reminder time
      if (currentHour === preferredHour && currentMinute === preferredMinute) {
        const today = now.weekdayLong.toLowerCase().slice(0, 3);
        const hasClassToday = user.raspored && user.raspored[today]?.length > 0;

        if (!hasClassToday) {
          await sendPracticeReminder(user);
        }
      }
    }
  });
};

// Schedule class reminders
const scheduleClassReminders = async () => {
  // Schedule day-before reminders to run at 18:00 every day
  schedule.scheduleJob('0 18 * * *', async () => {
    const users = await User.findAll({
      where: { 
        isStudent: true,
        reminderPreferences: {
          classReminders: true
        }
      },
      include: [
        {
          model: Raspored,
          as: 'raspored'
        }
      ]
    });

    const now = DateTime.now().setZone('Europe/Zagreb');
    const tomorrow = now.plus({ days: 1 });
    const tomorrowDay = tomorrow.weekdayLong.toLowerCase().slice(0, 3);

    for (const user of users) {
      // Get regular instrument classes
      const tomorrowClasses = user.raspored?.[tomorrowDay] || [];

      // Get theory classes if user attends theory
      let tomorrowTheoryClasses = [];
      if (user.pohadjaTeoriju && user.rasporedTeorijaId) {
        const theorySchedule = await RasporedTeorija.findByPk(user.rasporedTeorijaId);
        if (theorySchedule) {
          tomorrowTheoryClasses = theorySchedule[tomorrowDay] || [];
        }
      }

      // Send reminders for tomorrow's classes
      if (tomorrowClasses.length > 0 || tomorrowTheoryClasses.length > 0) {
        await sendClassReminder(user, null, 'day_before');
      }
    }
  });

  // Schedule hour-before reminders to run every 5 minutes
  schedule.scheduleJob('*/5 * * * *', async () => {
    const users = await User.findAll({
      where: { 
        isStudent: true,
        reminderPreferences: {
          classReminders: true
        }
      },
      include: [
        {
          model: Raspored,
          as: 'raspored'
        }
      ]
    });

    const now = DateTime.now().setZone('Europe/Zagreb');
    const oneHourFromNow = now.plus({ hours: 1 });
    const today = now.weekdayLong.toLowerCase().slice(0, 3);

    for (const user of users) {
      // Get regular instrument classes
      const todayClasses = user.raspored?.[today] || [];

      // Get theory classes if user attends theory
      let todayTheoryClasses = [];
      if (user.pohadjaTeoriju && user.rasporedTeorijaId) {
        const theorySchedule = await RasporedTeorija.findByPk(user.rasporedTeorijaId);
        if (theorySchedule) {
          todayTheoryClasses = theorySchedule[today] || [];
        }
      }

      // Check for hour-before reminders for regular classes
      for (const class_ of todayClasses) {
        const classTime = DateTime.fromFormat(class_.vrijeme, 'HH:mm', { zone: 'Europe/Zagreb' });
        const timeDiff = Math.abs(classTime.diff(oneHourFromNow, 'minutes').minutes);

        // If class starts in approximately one hour (±2.5 minutes buffer)
        if (timeDiff <= 2.5) {
          await sendClassReminder(user, class_.vrijeme, 'hour_before');
        }
      }

      // Check for hour-before reminders for theory classes
      for (const class_ of todayTheoryClasses) {
        const classTime = DateTime.fromFormat(class_.vrijeme, 'HH:mm', { zone: 'Europe/Zagreb' });
        const timeDiff = Math.abs(classTime.diff(oneHourFromNow, 'minutes').minutes);

        // If class starts in approximately one hour (±2.5 minutes buffer)
        if (timeDiff <= 2.5) {
          await sendClassReminder(user, class_.vrijeme, 'hour_before');
        }
      }
    }
  });
};

module.exports = {
  schedulePracticeReminders,
  scheduleClassReminders
}; 