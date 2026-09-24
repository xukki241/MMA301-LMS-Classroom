import nodemailer from "nodemailer";

export async function sendOtpEmail(email: string, code: string): Promise<void> {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = Number(process.env.SMTP_PORT ?? 587);

  console.log(`\n======================================================`);
  console.log(`🔑 [EMAIL OTP VERIFICATION]`);
  console.log(`📧 Gửi mã tới: ${email}`);
  console.log(`🔢 MÃ XÁC THỰC (OTP 6 SỐ): >>> ${code} <<<`);
  console.log(`⏰ Thời hạn sử dụng: 5 phút`);
  console.log(`======================================================\n`);

  if (host && user && pass) {
    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });

      await transporter.sendMail({
        from: `"LMS Classroom" <${user}>`,
        to: email,
        subject: `[LMS Classroom] Mã xác thực đăng ký tài khoản: ${code}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: #2563eb; text-align: center; margin-bottom: 8px;">LMS Classroom</h2>
            <p style="font-size: 16px; color: #334155; text-align: center;">Mã xác thực đăng ký tài khoản của bạn</p>
            <div style="background-color: #f1f5f9; padding: 20px; text-align: center; border-radius: 8px; margin: 24px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1e293b;">${code}</span>
            </div>
            <p style="font-size: 14px; color: #64748b; line-height: 1.5;">
              Mã xác thực có hiệu lực trong vòng <strong>5 phút</strong>. Vui lòng không chia sẻ mã này cho bất kỳ ai để bảo vệ an toàn cho tài khoản.
            </p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="font-size: 12px; color: #94a3b8; text-align: center;">Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email.</p>
          </div>
        `,
      });
      console.log(`✅ [Nodemailer] Đã gửi email thành công tới ${email}`);
    } catch (err) {
      console.error(`⚠️ [Nodemailer Error] Không gửi được qua SMTP:`, err);
    }
  } else {
    console.log(`ℹ️ [Email Info] Chưa cấu hình SMTP_USER / SMTP_PASS trong .env. Mã OTP hiển thị ở log phía trên để test ngay.`);
  }
}
