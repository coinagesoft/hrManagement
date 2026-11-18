import nodemailer from 'nodemailer';

async function testSmtp() {
  console.log('Testing SMTP connection with provided Gmail credentials...');
  
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // TLS
    auth: {
      user: 'prasad.a1405@gmail.com',
      pass: 'kzys xqpv zmga gizz'.replace(/\s+/g, ''), // Gmail app passwords can be spaceless or with spaces
    },
  });

  try {
    await transporter.verify();
    console.log('SUCCESS! SMTP server connection and credentials verified successfully. ✅');
  } catch (err) {
    console.error('SMTP verification failed with spaceless pass, trying with original string...', err.message);
    const transporter2 = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: 'prasad.a1405@gmail.com',
        pass: 'kzys xqpv zmga gizz',
      },
    });
    await transporter2.verify();
    console.log('SUCCESS! SMTP server connection verified with original pass string. ✅');
  }
}

testSmtp().catch((err) => {
  console.error('Final SMTP test error:', err);
  process.exit(1);
});
