//META{"name":"ChatCLI","source":"https://github.com/MurmursOnSARS/BBDStuff/blob/master/Plugins/ChatCLI.plugin.js/","website":"https://github.com/MurmursOnSARS"}*//
/*@cc_on
@if (@_jscript)

	// Offer to self-install for clueless users that try to run this directly.
	var shell = WScript.CreateObject('WScript.Shell');
	var fs = new ActiveXObject('Scripting.FileSystemObject');
	var pathPlugins = shell.ExpandEnvironmentStrings('%APPDATA%\\BetterDiscord\\plugins');
	var pathSelf = WScript.ScriptFullName;
	// Put the user at ease by addressing them in the first person
	shell.Popup('It looks like you\'ve mistakenly tried to run me directly. \n(Don\'t do that!)', 0, 'I\'m a plugin for BetterDiscord', 0x30);
	if (fs.GetParentFolderName(pathSelf) === fs.GetAbsolutePathName(pathPlugins)) {
		shell.Popup('I\'m in the correct folder already.\nJust reload Discord with Ctrl+R.', 0, 'I\'m already installed', 0x40);
	} else if (!fs.FolderExists(pathPlugins)) {
		shell.Popup('I can\'t find the BetterDiscord plugins folder.\nAre you sure it\'s even installed?', 0, 'Can\'t install myself', 0x10);
	} else if (shell.Popup('Should I copy myself to BetterDiscord\'s plugins folder for you?', 0, 'Do you need some help?', 0x34) === 6) {
		fs.CopyFile(pathSelf, fs.BuildPath(pathPlugins, fs.GetFileName(pathSelf)), true);
		// Show the user where to put plugins in the future
		shell.Exec('explorer ' + pathPlugins);
		shell.Popup('I\'m installed!\nJust reload Discord with Ctrl+R.', 0, 'Successfully installed', 0x40);
	}
	WScript.Quit();

@else@*/

var ChatCLI = (() => {
  /* Setup */
  const config = {
    main: 'index.js',
    info: {
      name: 'ChatCLI',
      authors: [
        {
          name: 'MurmursOnSARS',
          discord_id: '660699868041314334',
          github_username: 'MurmursOnSARS',
          twitter_username: 'who_uses_twitter'
        }
      ],
      version: '1.0.0',
      description: 'Use the up and down arrows to autofill the text area with previous message contents, akin to Bash and other command-line interfaces (CLIs).',
      github: 'https://github.com/MurmursOnSARS',
      github_raw: 'https://raw.githubusercontent.com/MurmursOnSARS/BBDStuff/master/Plugins/ChatCLI.plugin.js'
    }
  };

  /* Build */
  const buildPlugin = ([Plugin, Api]) => {
    const { DiscordAPI } = Api;
    const up_arrow = 38;
    const down_arrow = 40;
    var counter = 0;
    var channel = DiscordAPI.currentChannel ? DiscordAPI.currentChannel.discordObject.id : null;
    
    return class ChatCLI extends Plugin {
      
      onStart() {
        this.listen();
      }
      onStop() {
        this.unlisten();
      }

      /* Listener */
      listen() {
        document.addEventListener("keydown", event => this.editTextArea(event), true);
      }
      
      editTextArea(event) {
        if(event.keyCode !== up_arrow && event.keyCode !== down_arrow) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        // console.log(event);
        if(!DiscordAPI.currentChannel) return;
        if(DiscordAPI.currentChannel.discordObject.id !== channel) {
          counter = 0;
          channel = DiscordAPI.currentChannel.discordObject.id;
        }
        if(event.keyCode === up_arrow) counter += 1;
        if(event.keyCode === down_arrow && counter !== 0) counter -= 1;
        // console.log(counter);
        var allmessages = document.querySelectorAll('.messages-3amgkR .message-2qnXI6 .markup-2BOw-j');
        // console.log(allmessages.length);
        if(allmessages.length < counter) return;
        var message = allmessages[allmessages.length-counter];
        // if(message.innerText === null) return; not useful here
        // console.log(message.innerText);
        document.querySelector(".slateContainer-3Qkn2x").__reactInternalInstance$.return.stateNode.editorRef.deleteLineBackward();
        if(counter !== 0) document.querySelector(".slateContainer-3Qkn2x").__reactInternalInstance$.return.stateNode.editorRef.insertText(message.innerText);
        if(counter === 0) document.querySelector(".slateContainer-3Qkn2x").__reactInternalInstance$.return.stateNode.editorRef.deleteLineBackward();
        return false; 
      }
      
      unlisten() {
        document.removeEventListener("keydown", event => this.editTextArea(event), true);
      }
      /* Listener */

      get [Symbol.toStringTag]() {
        return 'Plugin';
      }
      get name() {
        return config.info.name;
      }
      get short() {
        let string = '';

        for (let i = 0, len = config.info.name.length; i < len; i++) {
          const char = config.info.name[i];
          if (char === char.toUpperCase()) string += char;
        }

        return string;
      }
      get author() {
        return config.info.authors.map(author => author.name).join(', ');
      }
      get version() {
        return config.info.version;
      }
      get description() {
        return config.info.description;
      }
    };
  };

  /* Finalize */

  return !global.ZeresPluginLibrary
    ? class {
        getName() {
          return this.name.replace(/\s+/g, '');
        }
        getAuthor() {
          return this.author;
        }
        getVersion() {
          return this.version;
        }
        getDescription() {
          return this.description;
        }
        stop() {}
        load() {
          const header = `Missing Library`;
          const content = `The Library ZeresPluginLibrary required for ${this.name} is missing.`;
          const ModalStack = BdApi.findModuleByProps('push', 'update', 'pop', 'popWithKey');
          const TextElement = BdApi.findModuleByProps('Sizes', 'Weights');
          const ConfirmationModal = BdApi.findModule(m => m.defaultProps && m.key && m.key() === 'confirm-modal');
          const onFail = () => BdApi.getCore().alert(header, `${content}<br/>Due to a slight mishap however, you'll have to download the library yourself.<br/><br/><a href="http://betterdiscord.net/ghdl/?url=https://github.com/rauenzi/BDPluginLibrary/blob/master/release/0PluginLibrary.plugin.js"target="_blank">Click here to download ZeresPluginLibrary</a>`);
          if (!ModalStack || !ConfirmationModal || !TextElement) return onFail();
          ModalStack.push(props => {
            return BdApi.React.createElement(
              ConfirmationModal,
              Object.assign(
                {
                  header,
                  children: [TextElement({ color: TextElement.Colors.PRIMARY, children: [`${content} Please click Download Now to install it.`] })],
                  red: false,
                  confirmText: 'Download Now',
                  cancelText: 'Cancel',
                  onConfirm: () => {
                    const request = require('request');
                    const fs = require('fs');
                    const path = require('path');
                    const waitForLibLoad = callback => {
                      if (!global.BDEvents) return callback();
                      const onLoaded = e => {
                        if (e !== 'ZeresPluginLibrary') return;
                        BDEvents.off('plugin-loaded', onLoaded);
                        callback();
                      };
                      BDEvents.on('plugin-loaded', onLoaded);
                    };
                    request('https://rauenzi.github.io/BDPluginLibrary/release/0PluginLibrary.plugin.js', (error, response, body) => {
                      if (error) return onFail();
                      fs.writeFile(path.join(window.ContentManager.pluginsFolder, '0PluginLibrary.plugin.js'), body, () => {});
                      waitForLibLoad(() => pluginModule.reloadPlugin(this.name));
                    });
                  }
                },
                props
              )
            );
          });
        }
        start() {}
        get [Symbol.toStringTag]() {
          return 'Plugin';
        }
        get name() {
          return config.info.name;
        }
        get short() {
          let string = '';
          for (let i = 0, len = config.info.name.length; i < len; i++) {
            const char = config.info.name[i];
            if (char === char.toUpperCase()) string += char;
          }
          return string;
        }
        get author() {
          return config.info.authors.map(author => author.name).join(', ');
        }
        get version() {
          return config.info.version;
        }
        get description() {
          return config.info.description;
        }
      }
    : buildPlugin(global.ZeresPluginLibrary.buildPlugin(config));
})();

/*@end@*/
