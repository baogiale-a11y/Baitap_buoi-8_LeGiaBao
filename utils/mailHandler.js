const nodemailer = require("nodemailer");
const transporter = nodemailer.createTransport({
    host: "smtp.mailtrap.io",
    port: 2525,
    auth: {
        user: "b546961290d2f9",
        pass: "f2991a0cfb5aac" 
        }
});

/**
 * 
 * @param {string} to
 * @param {string} url
 */
async function sendMail(to, url) {
    try {
        await transporter.sendMail({
            from: '"MyApp Support" <support@myapp.com>',
            to: to,
            subject: "Yêu cầu reset mật khẩu",
            html: `
                <p>Bạn đã yêu cầu reset mật khẩu.</p>
                <p>Nhấn vào link sau để đổi mật khẩu: <a href="${url}">${url}</a></p>
                <p>Link này sẽ hết hạn sau 10 phút.</p>
            `,
        });
    } catch (error) {
        console.error("Lỗi gửi email reset mật khẩu:", error);
    }
}

/**
 * 
 * @param {string} to 
 * @param {string} username 
 * @param {string} password
 */
async function sendGeneratedPassword(to, username, password) {
    try {
        await transporter.sendMail({
            from: '"MyApp Admin" <admin@myapp.com>',
            to: to,
            subject: "Thông tin tài khoản mới của bạn",
            html: `<h1>Chào mừng, ${username}!</h1><p>Một tài khoản đã được tạo cho bạn.</p><p>Đây là thông tin đăng nhập của bạn:</p><ul><li><strong>Tên đăng nhập:</strong> ${username}</li><li><strong>Mật khẩu:</strong> <code>${password}</code></li></ul><p>Chúng tôi khuyến khích bạn đổi mật khẩu sau lần đăng nhập đầu tiên.</p>`,
        });
    } catch (error) {
        console.error("Lỗi gửi email mật khẩu:", error);
    }
}

module.exports = { sendMail, sendGeneratedPassword };