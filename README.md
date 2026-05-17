This is just an experimental project that was crated by following aPluralsight  course on Claude Code. 
I of course do what my brain does and went off track and started experimenting and trying other random things. 

Part of that was having this repo and adding "issues" and telling Claude Code to go ahead and pickup and issue and auto fix it. Don’t ask question just fix the issue.
Surpassingly it did it. And did it well. Only thin k I didn’t do is push this anywhere so it still has to be cloned, run the requirement steps and you can run it locally in a Docker container. 

BUT, still pretty cool to be able to do this in a couple hours. Most f that was me deviating and asking myself what if I do this…then doing it to see. 

I don’t think all developers will be replaced by AI. To be really successful you need to know what is happening in an App, security, etc. Like a high level man ager you need to know how to tell it what to do. Tue success will be those that know why you want a certain technology over another. The more precise in your instructions and what you want the better results and the more professional your outcome is. Right now there is a lot of AI Slop. People just put a few sentences in an d get a boring app but it’s garbage, security holes all over. API keys pushed to git repos. 

Throughout the course I took that walked through creating this I found a lot of insecurities. Things like API keys being stored in a JSN file. Wide open to anybody with access and when setting u this repo it didn’t create an ignore file so it didn’t add them. I had to tell it create a .gitignore and add those files AND eventually stop putting it in a JSON. Still it puts it in a file system file. It’s a env file so a little more secure (I guess?) but nowhere near good enough. SO people who see these things, catch them, know to get AI to NOT do these things. This is the people I see rising above the ashes. 
