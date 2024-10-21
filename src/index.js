export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (!isPublicRequest(request, path)) {
      const isAuthorized = await checkAuthorization(request, env);
      if (!isAuthorized) {
        return new Response('Unauthorized', { status: 401 });
      }
    }

    switch (path) {
      case '/':
        return await handleDefaultGet(env);
      case '/all':
        return await handleAllGet(env);
      case '/manage':
        return await handleManageGet(env);
      case '/manage/upload':
        return await handleUpload(request, env);
      case '/manage/remove':
        return await handleRemove(request, env);
      case '/manage/replace':
        return await handleReplace(request, env);
      case '/manage/select':
        return await handleSelect(request, env);
      default:
        return new Response('Not found', { status: 404 });
    }
  },
};

// Helper function to determine if a request is public
function isPublicRequest(request, path) {
  return request.method === 'GET';
}

// Helper function to check authorization
async function checkAuthorization(request, env) {
  const authHeader = request.headers.get('X-Auth-Bearer');
  const storedAuthKey = env.AUTH_KEY_SECRET;
  return authHeader === storedAuthKey;
}

async function handleDefaultGet(env) {
  const index = await getIndex(env);
  const selectedFile = index.find((file) => file.selected);

  return new Response(`
    <html>
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
        <title>Tutorium Resources</title>
        <style>
          body, html {
            margin: 0;
            padding: 0;
            height: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
            background: #f0f0f0;
          }
          .container {
            display: flex;
            flex-direction: column;
            align-items: center;
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            max-width: 90%;
            max-height: 90%;
            width: 100%;
            height: auto;
            overflow: hidden;
          }
          h1 {
            color: #333;
            text-align: center;
            margin: 0 0 20px 0;
          }
          .qr-code {
            max-width: 80%;
            height: auto;
            margin-top: 20px;
          }
          .download-btn, .btn {
            display: inline-block;
            margin-top: 10px;
            padding: 10px 15px;
            background-color: #007BFF;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            text-align: center;
          }
          .download-btn:hover, .btn:hover {
            background-color: #0056b3;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>${selectedFile ? selectedFile.name : 'No file selected'}</h1>
          <p style="margin:0;padding:0;color:gray">Scan code to download</p>
          <img class="qr-code" src="https://api.qrserver.com/v1/create-qr-code/?data=${selectedFile ? `https://cdn.jonasjones.dev/uni/ws2425/tutorien/epr/loesungen/${selectedFile.filename}` : ''}" alt="QR Code"/>
          <a class="btn download-btn" href="https://cdn.jonasjones.dev/uni/ws2425/tutorien/epr/loesungen/${selectedFile.filename}">Download</a>
          <a class="btn" href="/all">View All Files</a>
          <a style="padding-top:10px" href="https://discord.gg/wVXF7b6CkS" >Discord</a>
        </div>
        <a href="/manage" title="Manage Uploads" style="position:absolute;bottom:20px;right:20px;color: black">
          <i class="fas fa-cog" style="font-size: 24px;"></i>
        </a>
      </body>
    </html>
  `, { headers: { 'Content-Type': 'text/html' } });
}


// GET for "/all"
async function handleAllGet(env) {
  const index = await getIndex(env);
  index.reverse();
  const selectedFile = index.find((file) => file.selected);

  const listItems = index.map(file => `
    <li style="background-color: ${file.selected ? '#e0e0e0' : 'white'};">
      <b>${file.name}</b> - Uploaded on ${file.upload_date}
      <a class="btn" href="https://cdn.jonasjones.dev/uni/ws2425/tutorien/epr/loesungen/${file.filename}">Download</a>
      <img class="qr-code" src="https://api.qrserver.com/v1/create-qr-code/?data=https://cdn.jonasjones.dev/uni/ws2425/tutorien/epr/loesungen/${file.filename}" alt="QR Code" style="width: 100px;"/>
    </li>
  `).join('');

  return new Response(`
    <html>
      <head>
        <title>All Files - Tutorium Resources</title>
        <style>
          body { font-family: Arial, sans-serif; background: #f0f0f0; padding: 20px; }
          .container { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          ul { list-style: none; padding: 0; }
          li { margin: 15px 0; padding: 10px; background: #f9f9f9; border-radius: 5px; display: flex; align-items: center; justify-content: space-between; }
          .btn { padding: 5px 10px; background-color: #007BFF; color: white; text-decoration: none; border-radius: 5px; margin-right: 10px; }
          .btn:hover { background-color: #0056b3; }
          .qr-code { margin-left: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <a class="btn" href="/">Back to Current</a>
          <ul>${listItems}</ul>
        </div>
      </body>
    </html>
  `, { headers: { 'Content-Type': 'text/html' } });
}


// GET for "/manage"
async function handleManageGet(env) {
  const index = await getIndex(env);

  const tableRows = index.map((file, i) => `
    <tr>
      <td>${file.name}</td>
      <td>
        <input type="radio" name="selected" value="${i}" ${file.selected ? 'checked' : ''} 
          onchange="updateSelected('${file.filename}')">
      </td>
      <td><button onclick="removeFile('${file.filename}')">Remove</button></td>
      <td><input type="file" onchange="replaceFile('${file.filename}', this.files[0])"></td>
    </tr>
  `).join('');

  return new Response(`
    <html>
      <head>
        <title>Manage Files - Tutorium Resources</title>
        <style>
          body { font-family: Arial, sans-serif; background: #f0f0f0; padding: 20px; }
          .container { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background-color: #007BFF; color: white; }
          input[type="file"], input[type="password"], input[type="text"] { margin-top: 5px; }
          button { background-color: #dc3545; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer; }
          button:hover { background-color: #c82333; }
          .btn { background-color: #007BFF; color: white; text-decoration: none; border-radius: 5px; padding: 5px 10px; }
          .btn:hover { background-color: #0056b3; }
        </style>
      </head>
      <body>
        <div class="container">
          <label for="password">Password:</label>
          <input type="password" id="password" placeholder="Enter password"/>
          <table>
            <tr><th>Name</th><th>Selected</th><th>Remove</th><th>Replace</th></tr>
            ${tableRows}
          </table>
          <form id="upload-form" enctype="multipart/form-data">
            <input type="text" id="display-name" placeholder="Enter display name" required />
            <input type="file" name="file" required />
            <button type="submit">Upload</button>
          </form>
        </div>
        <script>
          function getAuthHeader() {
            const password = document.getElementById('password').value;
            return password ? { 'X-Auth-Bearer': password } : {};
          }

          document.getElementById('upload-form').onsubmit = async function(event) {
            event.preventDefault();
            const displayName = document.getElementById('display-name').value;
            const file = event.target.file.files[0];
            const formData = new FormData();
            formData.append('file', file);
            formData.append('displayName', displayName);
            await fetch('/manage/upload', {
              method: 'POST',
              body: formData,
              headers: getAuthHeader(),
            });
            location.reload();
          }

          async function removeFile(filename) {
            await fetch('/manage/remove', {
              method: 'POST',
              body: JSON.stringify({ filename }),
              headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader(),
              },
            });
            location.reload();
          }

          async function replaceFile(filename, newFile) {
            const formData = new FormData();
            formData.append('newFile', newFile);
            formData.append('filename', filename);
            await fetch('/manage/replace', {
              method: 'POST',
              body: formData,
              headers: getAuthHeader(),
            });
            location.reload();
          }

          async function updateSelected(filename) {
            await fetch('/manage/select', {
              method: 'POST',
              body: JSON.stringify({ filename }),
              headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader(),
              },
            });
            location.reload();
          }
        </script>
      </body>
    </html>
  `, { headers: { 'Content-Type': 'text/html' } });
}


// POST for "/manage/select"
async function handleSelect(request, env) {
  const { filename } = await request.json();

  const index = await getIndex(env);

  // Mark the selected file and unselect others
  index.forEach((file) => {
    file.selected = (file.filename === filename);
  });

  await updateIndex(env, index);

  return new Response('Selected file updated successfully');
}


// POST for "/manage/upload"
async function handleUpload(request, env) {
  const formData = await request.formData();
  const file = formData.get('file');
  const displayName = formData.get('displayName');

  // Validate file and displayName
  if (!file || !displayName) {
    return new Response('File and display name are required', { status: 400 });
  }

  const filename = `${Date.now()}_${file.name}`;
  await env.CDN_BUCKET.put(`uni/ws2425/tutorien/epr/loesungen/${filename}`, file.stream());

  // Update index.json with the new file
  const index = await getIndex(env);
  index.push({
    name: displayName,
    upload_date: new Date().toISOString(),
    filename,
    selected: false
  });
  await updateIndex(env, index);

  return new Response('File uploaded', { status: 200 });
}


// POST for "/manage/remove"
async function handleRemove(request, env) {
  const { filename } = await request.json();

  await env.CDN_BUCKET.delete(`uni/ws2425/tutorien/epr/loesungen/${filename}`);

  const index = await getIndex(env);
  const updatedIndex = index.filter(file => file.filename !== filename);
  await updateIndex(env, updatedIndex);

  return new Response('File removed successfully');
}

// POST for "/manage/replace"
async function handleReplace(request, env) {
  const formData = await request.formData();
  const newFile = formData.get('newFile');
  const filename = formData.get('filename');

  await env.CDN_BUCKET.put(`uni/ws2425/tutorien/epr/loesungen/${filename}`, newFile.stream());

  return new Response('File replaced successfully');
}

// Helper functions
async function getIndex(env) {
  const indexObj = await env.CDN_BUCKET.get('uni/ws2425/tutorien/epr/index.json');
  return indexObj ? JSON.parse(await indexObj.text()) : [];
}

async function updateIndex(env, index) {
  await env.CDN_BUCKET.put('uni/ws2425/tutorien/epr/index.json', JSON.stringify(index));
}
