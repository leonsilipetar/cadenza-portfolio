const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  requireTLS: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  secureOptions: 'TLSv1_2',
});

const sendSupportEmail = async (req, res) => {
  try {
    const { subject, message } = req.body;
    const user = req.user; // This comes from the verifyToken middleware

    // Send email to support
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd;">
        <div style="text-align: center;">
          <img src="https://cadenza.com.hr/logo512.png" alt="MAI - Cadenza Logo" style="max-width: 150px;" />
          <h1 style="color: rgb(252, 163, 17); font-size: 24px;">Novo pitanje za podršku</h1>
        </div>

        <div style="margin: 20px 0;">
          <h3>Detalji korisnika:</h3>
          <p><strong>Ime i prezime:</strong> ${user.ime} ${user.prezime}</p>
          <p><strong>Email:</strong> ${user.email}</p>
          <p><strong>Tip korisnika:</strong> ${user.isMentor ? 'Mentor' : 'Student'}</p>
        </div>

        <div style="margin: 20px 0;">
          <h3>Pitanje:</h3>
          <p><strong>Predmet:</strong> ${subject}</p>
          <p><strong>Poruka:</strong></p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px;">
            ${message.replace(/\n/g, '<br>')}
          </div>
        </div>
      </div>
    `;

    // Send auto-response to user
    const userAutoResponse = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd;">
        <div style="text-align: center;">
          <img src="https://cadenza.com.hr/logo512.png" alt="MAI - Cadenza Logo" style="max-width: 150px;" />
          <h1 style="color: rgb(252, 163, 17); font-size: 24px;">Zaprimili smo vaš upit</h1>
        </div>

        <div style="margin: 20px 0;">
          <p>Poštovani/a ${user.ime} ${user.prezime},</p>
          <p>Hvala vam na vašem upitu. Ova poruka je automatski odgovor koji potvrđuje da smo zaprimili vaše pitanje:</p>

          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <p><strong>Predmet:</strong> ${subject}</p>
          </div>

          <p>Odgovor na vaš upit možete očekivati u roku od par dana (najkasnije tjedan dana).</p>

          <p>Hvala vam na razumijevanju!</p>

          <p style="margin-top: 20px;">Srdačan pozdrav,<br>MAI - Cadenza Tim</p>
        </div>
      </div>
    `;

    // Send both emails
    await Promise.all([
      // Send to support
      transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: process.env.ERR_EMAIL_TO,
        subject: `Cadenza Support - ${subject}`,
        html: htmlContent
      }),
      // Send auto-response to user
      transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: 'Zaprimljen upit za podršku - MAI Cadenza',
        html: userAutoResponse
      })
    ]);

    res.status(200).json({ message: 'Support email sent successfully' });
  } catch (error) {
    console.error('Error sending support email:', error);
    res.status(500).json({ message: 'Failed to send support email' });
  }
};

module.exports = {
  sendSupportEmail
};