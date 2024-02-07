module.exports = (emailContent) => {
  const { uuid } = emailContent;
  return `
    <!DOCTYPE html>
    <html>
        <head>
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css"/>
            <style>
            * {
                box-sizing: border-box;
                font-size: 1.5rem;
            }
            </style>
        </head>
        <body>
            <h1 class="text-success">EMAIL CONFIRMATION</H1>
            <h6 class=''>Kindly visit this <a href="https://admission.chmsu.edu.ph/${uuid}">link</a></h6>
        </body>
    </html>
    `;
};
