const express = require('express');
const router = express.Router();
const SpotifyWebApi = require('spotify-web-api-node');


const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.SPOTIFY_REDIRECT_URI,
});

// Function to make API requests
async function fetchWebApi(endpoint, method, token, body = null) {
    const fetch = (await import('node-fetch')).default;
    const res = await fetch(`https://api.spotify.com/${endpoint}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      method,
      body: body ? JSON.stringify(body) : undefined,
    });
    return await res.json();
  }  

router.get('/auth', (req, res) => {
  const authorizeURL = spotifyApi.createAuthorizeURL(['user-read-playback-state', 'playlist-modify-public']);
  res.redirect(authorizeURL);
});

router.get('/callback', (req, res) => {
  const { code } = req.query;
  spotifyApi.authorizationCodeGrant(code).then(data => {
    req.session.accessToken = data.body['access_token'];
    req.session.refreshToken = data.body['refresh_token'];
    res.redirect('/');
  }).catch(err => res.send('Error authorizing: ' + err));
});

router.get('/current-song', (req, res) => {
  if (!req.session.accessToken) {
    return res.status(401).json({ error: 'Not authorized' });
  }
  spotifyApi.setAccessToken(req.session.accessToken);
  spotifyApi.getMyCurrentPlaybackState().then(data => {

    const song = data.body && data.body.item ? data.body.item : null;
    res.json({ song });
  }).catch(err => res.status(500).json({ error: 'Error fetching playback state: ' + err }));
});

router.post('/rate', async (req, res) => {
    if (!req.session.accessToken) {
      return res.status(401).json({ error: 'Not authorized' });
    }
  
    const { rating, songUri } = req.body;
  
    // Log the received request body
    console.log('Request body:', req.body);
  
    // Validate the rating and songUri
    if (!rating || !songUri) {
      return res.status(400).json({ error: 'Rating and song URI are required' });
    }
  
    const playlistName = `Rating ${rating}`;
    spotifyApi.setAccessToken(req.session.accessToken);
  
    try {
      const token = req.session.accessToken;
      const user = await fetchWebApi('v1/me', 'GET', token);
  
      // Function to find a playlist by name
      async function findPlaylistByName(name) {
        const data = await fetchWebApi('v1/me/playlists', 'GET', token);
        const playlists = data.items;
        return playlists.find(playlist => playlist.name === name);
      }
  
      // Function to create a new playlist
      async function createPlaylist(name) {
        const data = await fetchWebApi(`v1/users/${user.id}/playlists`, 'POST', token, {
          name: name,
          description: 'Automatically created playlist based on rating',
          public: true,
        });
        return data.id;
      }
  
      let playlist = await findPlaylistByName(playlistName);
      let playlistId;


      if (playlist) {
        console.log(`Playlist found: ${playlist.name} (${playlist.id})`);
        playlistId = playlist.id;
      } else {
        console.log(`Playlist not found, creating new playlist: ${playlistName}`);
        playlistId = await createPlaylist(playlistName);
      }
      
      console.log(`Adding track to playlist: ${playlistId}, Track URI: ${songUri}`);
      await fetchWebApi(`v1/playlists/${playlistId}/tracks?uris=${songUri}`, 'POST', token);
      res.json({ message: 'Song rated successfully!' });
      
    } catch (err) {
      console.error('Error rating song:', err);
      res.status(500).json({ error: 'Error rating song: ' + err });
    }
  });

module.exports = router;
