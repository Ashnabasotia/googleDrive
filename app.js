const express = require('express')
const multer = require('multer')
const fs = require('fs')
const path = require('path')

const OAuth2Data = require('./credentials.json')

const {google} = require('googleapis')


const app = express()

const CLIENT_ID = OAuth2Data.web.client_id
const CLIENT_SECRET = OAuth2Data.web.client_secret
const REDIRECT_URI = OAuth2Data.web.redirect_uris[0]

const oAuth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
);

var authed = false

const SCOPES = "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile"

app.set("view engine", "ejs")

var Storage = multer.diskStorage({
    destination: function (req,file,callback){
        callback(null,'./uploads');
    },
    filename: function(req,file,callback){
        const flname = file.originalname.substring(0,file.originalname.lastIndexOf('.'))+'-'+Date.now()+path.extname(file.originalname)
        callback(null,flname)
    }
})
var upload = multer({
    storage: Storage
}).single("file");

app.post("/uploads", (req,res) =>{
    upload(req, res, function(err){
        if(err){
            console.log(err)
            return res.end("Something went wrong");
        }else{
            console.log(req.file.path);
            const drive = google.drive({ version: "v3", auth: oAuth2Client})
            const fileMetadata = {
                name: req.file.filename
            }
            const media = {
                mimeType: req.file.minetype,
                body: fs.createReadStream(req.file.path),
            }
            drive.files.create(
                {
                    resource: fileMetadata,
                    media: media,
                    fields: "id"
                },
                (err,file) => {
                    if(err){
                        console.error(err)
                    }else{
                        fs.unlinkSync(req.file.path)
                        res.render("choose-form", { success:false })
                    }
                }
            )
        }
    } )
})

app.get('/', (req,res) => {
    if(!authed){

        var url = oAuth2Client.generateAuthUrl({
            access_type:'offline',
            scope:SCOPES
        })
        console.log(url)
        res.render("index",{url:url})

    }else{
        console.log("User Authenticated")
        res.render("choose-form",{success: false})
    }
})

app.get('/google/callback', (req,res) => {
    const code = req.query.code

    if(code){
        oAuth2Client.getToken(code,function(err,tokens){
            if(err){
                console.log("Error in Authentication")
                console.log(err)
            }
            else{
                console.log("Successfully authenticated")
                console.log(tokens)
                oAuth2Client.setCredentials(tokens)
                authed = true;
                res.redirect('/')
            }
        })
    }
})

app.listen(5000, ()=>{
    console.log("Server is Listening....")
})