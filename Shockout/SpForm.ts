/// <reference path="../typings/knockout.d.ts" />
/// <reference path="../typings/jquery.d.ts" />
/// <reference path="../typings/jquery.ui.datetimepicker.d.ts" />
/// <reference path="../typings/jqueryui.d.ts" />
'use strict';

/**
* -----------------
* Shockout SP Form
* -----------------
* By John Bonfardeci <john.bonfardeci@gmail.com>
*
* GitHub: https://github.com/jbonfardeci/ShockoutForms
*
* A Replacement for InfoPath and XSLT Forms
* Leverage the power Knockout JS databinding with SharePoint services for modern and dynamic web form development. 
*
* Minimum Usage: 
* `var spForm = new Shockout.SPForm('My SharePoint List Name', 'my-form-ID', {});`
* 
* Dependencies: jQuery 1.72+, jQuery UI<any>, KnockoutJS 3.2+
* Compatible with Bootstrap CSS - http://getbootstrap.com
*    
*   Copyright (C) 2015  John T. Bonfardeci
*
*   This program is free software: you can redistribute it and/or modify
*   it under the terms of the GNU Affero General Public License as
*   published by the Free Software Foundation, either version 3 of the
*   License, or (at your option) any later version.
*
*   This program is distributed in the hope that it will be useful,
*   but WITHOUT ANY WARRANTY; without even the implied warranty of
*   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
*   GNU Affero General Public License for more details.
*
*   You should have received a copy of the GNU Affero General Public License
*   along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/
module Shockout {

    export class SPForm {

        public static DEBUG: boolean = false;

        ///////////////////////////////////////////
        // Minimum Required Constructor Parameters
        ///////////////////////////////////////////
        // the ID of the form
        public formId: string;

        // The name of the SP List you're submitting a form to.
        public listName: string;
        public listNameRest: string;

        ////////////////////////////
        // Public Static Properties
        ////////////////////////////
        public static errorLogListName: string;

        /////////////////////////
        // Public jQuery Objects
        /////////////////////////
        public $createdInfo;
        public $dialog;
        public $form;
        public $formAction;
        public $formStatus;

        /////////////////////
        // Public Properties
        /////////////////////

        // Allow users to delete a form
        public allowDelete: boolean = false;

        // Allow users to print
        public allowPrint: boolean = true;

        // Enable users to save their form before submitting
        public allowSave: boolean = false;

        // Allowed extensions for file attachments
        public allowedExtensions: Array<string> = ['txt', 'rtf', 'zip', 'pdf', 'doc', 'docx', 'jpg', 'gif', 'png', 'ppt', 'tif', 'pptx', 'csv', 'pub', 'msg'];

        public asyncFns: Array<any>;

        // Message to display if a file attachment is required - good for receipts attached to purchase requisitions and such
        public attachmentMessage: string = 'An attachment is required.';
        
        // Redeirect users after form submission to this page.
        public confirmationUrl: string = '/SitePages/Confirmation.aspx';

        // Run in debug mode with extra logging; disables error logging to SP list.
        public debug: boolean = false;

        // jQuery UI dialog options
        public dialogOpts: any = {
            width: 400,
            height: 250,
            autoOpen: false,
            show: {
                effect: "blind",
                duration: 1000
            },
            hide: {
                effect: "explode",
                duration: 1000
            }
        };
        
        // Override the SP List fields a user is allowed to submit. 
        public editableFields: Array<string> = [];

        // Enable users to attach files.
        public enableAttachments: boolean = false;

        // Enable error logging to SP List. Good if you want to track and debug errors that users may run into.
        public enableErrorLog: boolean = true;

        // The name of the SP List to log errors to
        public errorLogListName: string = 'Error Log';

        public fieldNames: Array<string> = [];

        // The relative URL of the Handler that attaches fiel uploads to list items.
        public fileHandlerUrl: string = '/_layouts/SPFormFileHandler.ashx';

        // The setting sobject for File Uploader
        public fileUploaderSettings: IFileUploaderSettings;

        // The File Uploader object
        public fileUploader: any;
                
        // Display the user profiles of the users that created and last modified a form. Includes photos. See `Shockout.Templates.getUserProfileTemplate()` in `templates.ts`.
        public includeUserProfiles: boolean = true;

        // Display logs from the workflow history list assigned to form workflows.
        public includeWorkflowHistory: boolean = true;
                
        // Function to execute before rendering templates and before Knockout databinding. Good for inserting your own markup and logic.
        public preRender: Function;

        // Function to execute after a form has rendered all templates and after Knockout binding has taken place.
        public postRender: Function;

        // Function to execute before sacing/submitting a form. Good place to insert extra logic such as extra validation.
        public preSave: Function;

        // Set to true if at least one attachment is required for a form. Good requriring receipts to purchase requisitions and such. 
        public requireAttachments: boolean = false;
        
        // The relative URL of the SP subsite where the target SP list is located.
        public siteUrl: string = '';      

        // Utility methods for internal and external use.
        public utils: Utils = Utils;

        // The form's Knockout view model.
        public viewModel: IViewModel;

        public viewModelIsBound: boolean = false;
           
        // The SP list name of the workflow history list where form workflow entries are stored.
        // Displays workflow history to viewer so they know the status of their form. Depends on writing workflows with good logging.
        // Be careful,. Workflow History lsits can exceed the maximum amount of items regular users are allowed to view. Be sure to implement
        // a good Powershell script to clean up your workflow history lists with Task Scheduler on the server. Good luck doing that with Office 365! 
        public workflowHistoryListName: string = 'Workflow History';
       
        /////////////////////////////////////
        // Private Set Public Get Properties
        /////////////////////////////////////
        /**
        * Get the current logged in user profile.
        * @return ICurrentUser
        */
        public getCurrentUser(): ICurrentUser { return this.currentUser; }
        private currentUser: ICurrentUser = {
            id: null,
            title: null,
            login: null,
            email: null,
            account: null,
            jobtitle: null,
            department: null,
            isAdmin: false,
            groups: []
        };
      
        /**
        * Get the default view for the list.
        * @return string
        */
        public getDefaultViewUrl(): string { return this.defaultViewUrl; }
        private defaultViewUrl: string;
       
        /**
        * Get the default mobile view for the list.
        * @return string
        */
        public getDefailtMobileViewUrl(): string { return this.defailtMobileViewUrl; }
        private defailtMobileViewUrl: string;
        
        /**
        * Get a reference to the form element.
        * @return HTMLElement
        */
        public getForm(): HTMLElement { return this.form; }
        private form: HTMLElement;

        /**
        * Get the SP list item ID number.
        * @return number
        */
        public getItemId(): number { return this.itemId; }
        private itemId: number = null;

        /**
        * Get the GUID of the SP list.
        * @return HTMLElement
        */
        public getListId(): string { return this.listId; }
        private listId: string = null;

        /**
        * Get a reference to the original SP list item.
        * @return ISpItem
        */
        public getListItem(): ISpItem { return this.listItem; }
        private listItem: ISpItem = null;

        /**
        * Requires user to checkout the list item?
        * @return boolean
        */
        private requireCheckout: boolean = false;
        public requiresCheckout(): boolean { return this.requireCheckout; }

        /**
        * Get the SP site root URL
        * @return string
        */
        private rootUrl: string = window.location.protocol + '//' + window.location.hostname + (!!window.location.port ? ':' + window.location.port : '');
        public getRootUrl(): string { return this.rootUrl; }

        /**
        * Get the `source` key's value from the querystring.
        * @return string
        */
        private sourceUrl: string = null;
        public getSourceUrl(): string { return this.sourceUrl; }

        /**
        * Get a reference to the form's Knockout view model. 
        * @return string
        */
        public getViewModel(): IViewModel { return this.viewModel; }

        /**
        * Get the version number for this framework. 
        * @return string
        */
        public getVersion(): string { return this.version; }
        private version: string = '0.0.1';

        public queryStringId: string = 'formid';

        public isSp2013: Boolean = false;

        constructor(listName: string, formId: string, options: Object) {
            var self = this;
            var error;

            // sanity check
            if (!(this instanceof SPForm)) {
                error = 'You must declare an instance of this class with `new`.';
                alert(error);
                throw error;
                return;
            }

            // ensure we have the parameters we require
            if (!!!formId || !!!listName) {
                var errors: any = ['Missing required parameters:'];
                if (!!!this.formId) { errors.push(' `formId`') }
                if (!!!this.listName) { errors.push(' `listName`') }
                errors = errors.join('');
                alert(errors);
                throw errors;
                return;
            }

            // these are the only parameters required
            this.formId = formId; // string ID of the parent form - could be any element you choose.
            this.listName = listName; // the name of the SP List
            this.listNameRest = Utils.toCamelCase(listName);

            // get the form container element
            this.form = <HTMLElement>(typeof formId == 'string' ? document.getElementById(formId) : formId);

            if (!!!this.form) {
                alert('An element with the ID "' + this.formId + '" was not found. Ensure the `formId` parameter in the constructor matches the ID attribute of the form element.');
                return;
            }

            this.$form = $(this.form).addClass('sp-form');

            // Prevent browsers from doing their own validation to allow users to press the `Save` button even when all required fields aren't filled in.
            // We're doing validation ourselves when users presses the `Submit` button.
            $('form').attr({'novalidate': 'novalidate'});

            //if accessing the form from a SP list, take user back to the list on close
            this.sourceUrl = Utils.getQueryParam('source'); 

            if (!!this.sourceUrl) {
                this.sourceUrl = decodeURIComponent(this.sourceUrl);
            }

            // override default instance variables with key-value pairs from options
            if (options && options.constructor === Object) {
                for (var p in options) {
                    this[p] = options[p];
                }
            }

            SPForm.DEBUG = this.debug;

            // try to parse the form ID from the hash or querystring
            this.itemId = Utils.getIdFromHash();
            var idFromQs = Utils.getQueryParam(this.queryStringId);

            if (!!!this.itemId && /\d/.test(idFromQs)) {
                // get the SP list item ID of the form in the querystring
                this.itemId = parseInt(idFromQs);
                Utils.setIdHash(this.itemId);
            }           

            // setup static error log list name
            SPForm.errorLogListName = this.errorLogListName;

            // initialize custom Knockout handlers
            KoHandlers.bindKoHandlers();

            // create instance of the Knockout View Model
            this.viewModel = new ViewModel(this);

            // create element for displaying form load status
            self.$formStatus = $('<div>', { 'class': 'form-status' }).appendTo(self.$form);

            // set the element to display created/modified by info
            self.$createdInfo = self.$form.find(".created-info");

            // create jQuery Dialog for displaying feedback to user
            self.$dialog = $('<div>', { 'id': 'formdialog' })
                .appendTo(self.$form)
                .dialog(self.dialogOpts);

            // Cascading Asynchronous Function Execution (CAFE) Array
            // Don't change the order of these unless you know what you're doing.
            this.asyncFns = [            
                self.getCurrentUserAsync
                , function (self: SPForm) {
                    if (self.preRender) {
                        self.preRender(self, self.viewModel);
                    }
                    self.nextAsync(true);
                }  
                , self.getListAsync      
                , self.initFormAsync 
                , function (self: SPForm, args: any = undefined) {
                    // apply Knockout bindings
                    ko.applyBindings(self.viewModel, self.form);
                    self.viewModelIsBound = true;
                    self.nextAsync(true);
                }            
                , self.getListItemAsync
                , self.getUsersGroupsAsync
                , self.implementPermissionsAsync
                , self.getAttachmentsAsync
                , self.getHistoryAsync
                , function (self: SPForm) {
                    if (self.postRender) {
                        self.postRender(self, self.viewModel);
                    }
                    self.nextAsync(true);
                }
                , self.setupNavigation
            ];

            //start CAFE
            this.nextAsync(true, 'Begin initialization...');         
        }

        /**
        * Execute the next asynchronous function from `asyncFns`.
        * @param success?: boolean = undefined
        * @param msg: string = undefined
        * @param args: any = undefined
        * @return void
        */
        nextAsync(success: boolean = true, msg: string = undefined, args: any = undefined): void {
            var self = this;

            if (msg) {
                this.updateStatus(msg, success);
            }

            if (!success) { return; }

            if (this.asyncFns.length == 0) {
                setTimeout(function () {
                    self.$formStatus.hide();
                }, 2000);
                return;
            }
            // execute the next function in the array
            this.asyncFns.shift()(self, args);
        }

        /**
        * Get the current logged in user's profile.
        * @param self: SPForm
        * @param args?: any = undefined
        * @return void
        */
        getCurrentUserAsync(self: SPForm, args: any = undefined): void {

            self.updateStatus('Retrieving your account...');
            var success: string = 'Retrieved your account.';

            if (self.debug) {
                console.info('Testing for SP 2013 API...');
            }

            // If this is SP 2013, it will return thre current user's account.
            SpApi15.getCurrentUser(function (user: ICurrentUser, error: number) {

                if (error == 404) {
                    getSp2010User();
                } else {
                    self.isSp2013 = true;
                    self.currentUser = user;
                    self.viewModel.currentUser(user);

                    if (self.debug) {
                        console.info('This is the SP 2013 API.');
                        console.info('Current user is...');
                        console.info(self.viewModel.currentUser());
                    }

                    self.nextAsync(true, success);
                }
            });

            function getSp2010User() {
                SpSoap.getCurrentUser(function (user: ICurrentUser, error: string) {

                    if (!!error) {
                        self.nextAsync(false, 'Failed to retrieve your account. ' + error);
                        return;
                    }

                    self.currentUser = user;
                    self.viewModel.currentUser(user);

                    if (self.debug) {
                        console.info('This is SP 2010 REST services.');
                        console.info('Current user is...');
                        console.info(self.viewModel.currentUser());
                    }

                    self.nextAsync(true, success);
                });
            }
        }

        /**
        * Get metadata about an SP list and the fields to build the Knockout model.
        * Needed to determine the list GUID, if attachments are allowed, and if checkout/in is required.
        * @param self: SPForm
        * @param args?: any = undefined
        * @return void
        */
        getListAsync(self: SPForm, args: any = undefined): void {
            
            // Determine if the field is a `Choice` or `MultiChoice` field with choices.
            var rxIsChoice = /choice/i;
            var rxExcludeNames: RegExp = /^(FolderChildCount|ItemChildCount|MetaInfo|ContentType|Edit|Type|LinkTitleNoMenu|LinkTitle|LinkTitle2|Version|Attachments)/;

            SpSoap.getList(self.siteUrl, self.listName, function (xmlDoc: XMLDocument, error: string) {
                if (!!error) {
                    var msg = 'Failed to retrieve list data. ' + error;
                    self.nextAsync(false, 'Failed to retrieve list data. ' + error);
                    self.logError(msg);
                    return;
                }

                setupList(xmlDoc);
            });


            function setupList(xmlDoc: XMLDocument): void {
                try {
                    var $list = $(xmlDoc).find('List').first();
                    var listId = $list.attr('ID');
                    self.listId = listId;

                    var requireCheckout = $list.attr('RequireCheckout');
                    self.requireCheckout = !!requireCheckout ? requireCheckout.toLowerCase() == 'true' : false;

                    var enableAttachments = $list.attr('EnableAttachments');
                    self.enableAttachments = !!enableAttachments ? enableAttachments.toLowerCase() == 'true' : false;

                    self.defaultViewUrl = $list.attr('DefaultViewUrl');
                    self.defailtMobileViewUrl = $list.attr('MobileDefaultViewUrl');

                    // Build the Knockout view model
                    //$(xmlDoc).find('Field').filter(function (i: number, el: any) {
                    //    return !!!($(el).attr('Hidden')) && !!($(el).attr('DisplayName')) && !rxExcludeNames.test($(el).attr('Name')) && !rxExcludeNames.test($(el).attr('DisplayName'));
                    //}).each(setupKoVar);

                    $(xmlDoc).find('Field').filter(function (i: number, el: any) {
                        return !!($(el).attr('DisplayName')) && $(el).attr('Hidden') != 'TRUE' && !rxExcludeNames.test($(el).attr('Name'));
                    }).each(setupKoVar);

                    // sort the field names alpha
                    self.fieldNames.sort();

                    if (self.debug) {
                        console.info(self.listName + ' list ID = ' + self.listId);
                        console.info('Field names are...');
                        console.info(self.fieldNames);
                    }

                    self.nextAsync(true);
                    return;
                }
                catch (e) {
                    self.nextAsync(false, 'Failed to initialize list settings.');
                    if (self.debug) {
                        console.warn(e);
                    }
                    return;
                }
            }

            function setupKoVar(i: number, el: any): void {

                if (!!!el) { return; }

                try {
                    var $el = $(el);
                    var displayName: string = $el.attr('DisplayName');
                    var spType: string = $el.attr('Type');
                    var spName: string = $el.attr('Name');
                    var spFormat: string = $el.attr('Format');
                    var spRequired: boolean = !!($el.attr('Required')) ? $el.attr('Required').toLowerCase() == 'true' : false;
                    var spReadOnly: boolean = !!($el.attr('ReadOnly')) ? $el.attr('ReadOnly').toLowerCase() == 'true' : false;
                    var spDesc: string = $el.attr('Description');
                    var vm: IViewModel = self.viewModel;

                    // Convert the Display Name to equal REST field name conventions.
                    // For example, convert 'Computer Name (if applicable)' to 'ComputerNameIfApplicable'.
                    var koName = Utils.toCamelCase(displayName);

                    // stop and return if it's already a Knockout object
                    if (koName in self.viewModel) { return; }

                    self.fieldNames.push(koName);

                    var defaultValue: any;
                    // find the SP field's default value if exists
                    $el.find('> Default').each(function (j: number, def: any): void {
                        var val: any = $.trim($(def).text());

                        if (!!spType) {

                            switch (spType.toLowerCase()) {
                                case 'boolean':
                                    val = val == '0' ? false : true;
                                    break;
                                case 'number':
                                case 'currency':
                                    val = val - 0;
                                    break;
                                case 'datetime':
                                    if (val == '[today]') { val = new Date(); }
                                    break;
                                default:
                                    //val = (val+'').length == 0 ? null : val;
                                    break;
                            }

                        }
                        defaultValue = val;
                    });

                    var koObj: any = !!spType && /^multi/i.test(spType)
                        ? ko.observableArray([])
                        : ko.observable(!!defaultValue ? defaultValue : spType == 'Boolean' ? false : null);
                    
                    // add metadata to the KO object
                    koObj._metadata = {
                        'koName': koName,
                        'displayName': displayName || null,
                        'name': spName || null,
                        'format': spFormat || null,
                        'required': spRequired || false,
                        'readOnly': spReadOnly || false,
                        'description': spDesc || null,
                        'type': spType
                    };

                    koObj._koName = koName;
                    koObj._displayName = displayName;
                    koObj._name = spName;
                    koObj._format = spFormat;
                    koObj._required = spRequired;
                    koObj._readOnly = spReadOnly;
                    koObj._description = spDesc;
                    koObj._type = spType;

                    if (rxIsChoice.test(spType)) {
                        var isFillIn = $el.attr('FillInChoice');

                        koObj._isFillInChoice = !!isFillIn && isFillIn == 'True'; // allow fill-in choices
                        var choices = [];

                        $el.find('CHOICE').each(function (j: number, choice: any) {
                            choices.push({ 'value': $(choice).text(), 'selected': false });
                        });

                        koObj._choices = choices;
                        koObj._multiChoice = !!spType && spType == 'MultiChoice';

                        koObj._metadata.choices = choices;
                        koObj._metadata.multichoice = koObj._multiChoice;
                    }

                    koObj._metadata.$parent = koObj;
                    vm[koName] = koObj;

                    if (self.debug) {
                        console.info('Created KO object: ' + koName + ', type: ' + spType + ', default val: ' + defaultValue);
                    }
                }
                catch (e) {
                    var error = 'Failed to setup KO object at getListAsync.setupKoVar: ';
                    if (self.debug) {
                        console.warn(error);
                        console.warn(e);
                    }
                    self.logError(error + JSON.stringify(e));
                }
            };
        }

        /**
        * Initialize the form.
        * @param self: SPForm
        * @param args?: any = undefined
        * @return void
        */
        initFormAsync(self: SPForm, args: any = undefined): void {            
            try {
                self.updateStatus("Initializing dynamic form features...");

                var vm: IViewModel = self.viewModel;
                var rx: RegExp = /submitted/i;

                // find out of this list allows saving before submitting and triggering workflow approval
                // must have a field with `submitted` in the name and it must be of type `Boolean`
                if (self.fieldNames.indexOf('IsSubmitted') > -1) {
                    self.allowSave = true;
                    ViewModel.isSubmittedKey = 'IsSubmitted';
                    if (self.debug) {
                        console.info('initFormAsync: IsSubmitted key: ' + ViewModel.isSubmittedKey);
                    }
                }

                // append action buttons
                self.$formAction = $(Templates.getFormAction(self.allowSave, self.allowDelete, self.allowPrint)).appendTo(self.$form);
                if (self.allowSave) {
                    self.$formAction.find('.btn.save').show();
                    if (self.debug) {
                        console.info('initFormAsync: Unhide Save button.');
                    }
                }

                if (self.enableAttachments) {
                    // set the absolute URI for the file handler 
                    self.fileHandlerUrl = self.rootUrl + self.siteUrl + self.fileHandlerUrl;

                    // file uploader default settings
                    self.fileUploaderSettings = {
                        element: null,
                        action: self.fileHandlerUrl,
                        debug: self.debug,
                        multiple: false,
                        maxConnections: 3,
                        allowedExtensions: self.allowedExtensions,
                        params: {
                            listId: self.listId,
                            itemId: self.itemId
                        },
                        onSubmit: function (id, fileName) { },
                        onComplete: function (id, fileName, json) {

                            if (self.debug) {
                                console.warn(json);
                            }

                            if (json.error != null && json.error != "") {
                                self.logError(json.error);
                                if (self.debug) {
                                    console.warn(json.error);
                                }
                                return;
                            }

                            if (self.itemId == null && json.itemId != null) {
                                self.itemId = json.itemId;
                                self.viewModel.Id(json.itemId);
                            }

                            // push a new SP attachment instance to the view model's `attachments` collection
                            self.viewModel.attachments().push(new SpAttachment(self.rootUrl, self.siteUrl, self.listName, self.itemId, fileName));
                            self.viewModel.attachments.valueHasMutated(); // tell KO the array has been updated
                        },
                        template: Templates.getFileUploadTemplate()
                    }

                    //setup attachments module
                    self.$form.find(".attachments").each(function (i: number, att: HTMLElement) {
                        var id = 'fileuploader_' + i;
                        $(att).append(Templates.getAttachmentsTemplate(id));
                        self.fileUploaderSettings.element = document.getElementById(id);
                        self.fileUploader = new Shockout.qq.FileUploader(self.fileUploaderSettings);
                    });

                    if (self.debug) {
                        console.info('initFormAsync: Attachments are enabled.');
                    }
                }

                // set up HTML editors in the form
                self.$form.find(".rte, [data-bind*='spHtml'], [data-sp-html]").each(function (i: number, el: HTMLElement) {
                    var $el = $(el);
                    var koName = Utils.observableNameFromControl(el);

                    var $rte = $('<div>', {
                        'data-bind': 'spHtmlEditor: ' + koName,
                        'class': 'form-control content-editable',
                        'contenteditable': 'true'
                    });

                    if (!!$el.attr('required') || !!$el.hasClass('required')) {
                        $rte.attr('required', 'required');
                        $rte.addClass('required');
                    }

                    $rte.insertBefore($el);
                    if (!self.debug) {
                        $el.hide();
                    }

                    if (self.debug) {
                        console.info('initFormAsync: Created spHtml field: ' + koName);
                    }
                });

                //append Created/Modified info to predefined section or append to form
                if (!!self.itemId) {
                    self.$createdInfo.html(Templates.getCreatedModifiedHtml());

                    //append Workflow history section
                    if (self.includeWorkflowHistory) {
                        self.$form.append(Templates.getHistoryTemplate());
                    }

                    if (self.debug) {
                        console.info('initFormAsync: show created/mod info.');
                    }
                }

                // remove elements with attribute `data-edit-only` from the DOM if not editing an existing form - a new form where `itemId == null || undefined`
                if (!!!self.itemId) {
                    self.$form.find('[data-edit-only]').each(function () {
                        $(this).remove();
                    });

                    if (self.debug) {
                        console.info('initFormAsync: setup elements with `data-edit-only` attribute.');
                    }
                }

                // remove elements with attribute `data-new-only` from the DOM if not a new form - an edit form where `itemId != null`
                if (!!self.itemId) {
                    self.$form.find('[data-new-only]').each(function () {
                        $(this).remove();
                    });

                    if (self.debug) {
                        console.info('initFormAsync: setup elements with `data-new-only` attribute.');
                    }
                }
               
                // data-submitted, data-not-submitted

                // add control validation to Bootstrap form elements
                // http://getbootstrap.com/css/#forms-control-validation 
                self.$form.find('[required], .required').each(function (i: number, el: HTMLElement) {
                    var koName = Utils.observableNameFromControl(el);
                    var $parent = $(el).closest('.form-group');
                    var css = "css: { 'has-error': !!!" + koName + "(), 'has-success has-feedback': !!" + koName + "()}";

                    // If the parent already has a data-bind attribute, append the css.
                    if (!!$parent.attr('data-bind')) {
                        var dataBind = $parent.attr("data-bind");
                        $parent.attr("data-bind", dataBind + ", " + css);
                    } else {
                        $parent.attr("data-bind", css);
                    }

                    $parent.append('<span class="glyphicon glyphicon-ok form-control-feedback" aria-hidden="true"></span>');
                });

                if (self.debug) {
                    console.info('initFormAsync: Required elements are initialized.');
                }

                self.nextAsync(true, "Form initialized.");
                return;
            }
            catch (e) {
                if (self.debug) {
                    console.warn(e);
                }
                self.logError("initFormAsync: " + e);
                self.nextAsync(false, "Failed to initialize form. " + e);
                return;
            }
        }

        /**
       * Get the SP list item data and build the Knockout view model.
       * @param self: SPForm
       * @param args?: any = undefined
       * @return void
       */
        getListItemAsync(self: SPForm, args: any = undefined): void {

            if (!!!self.itemId) {
                self.nextAsync(true, "This is a New form.");
                return;
            }

            self.updateStatus("Retrieving form values...");

            SpApi.getListItem(self.listName, self.itemId, callback, self.siteUrl);

            function callback(data: ISpItem, error: string) {
                if (!!error) {
                    if (/not found/i.test(error + '')) {
                        self.showDialog("The form with ID " + self.itemId + " doesn't exist or it was deleted.");
                    }
                    self.nextAsync(false, error);
                    return;
                }
                self.listItem = data;
                self.bindListItemValues(self);
                self.nextAsync(true, "Retrieved form data.");
            }
        }

        /**
        * Get the SP user groups this user is a member of for removing/showing protected form sections.
        * @param self: SPForm
        * @param args?: any = undefined
        * @return void
        */
        getUsersGroupsAsync(self: SPForm, args: any = undefined): void {
            if (self.$form.find("[data-sp-groups], [user-groups]").length == 0) {
                self.nextAsync(true);
                return;
            }

            self.updateStatus("Retrieving your groups...");

            if (self.isSp2013) {
                SpApi15.getUsersGroups(self.currentUser.id, callback);
            } else {
                SpSoap.getUsersGroups(self.currentUser.login, callback);
            }

            function callback(groups: Array<any>, error: string) {
                if (error) {
                    self.nextAsync(false, "Failed to retrieve your groups. " + error);
                    return;
                }

                self.currentUser.groups = groups;

                if (self.debug) {
                    console.info("Retrieved current user's groups...");
                    console.info(self.currentUser.groups);
                }

                self.nextAsync(true, "Retrieved your groups.");
            }
        }

        /**
        * Removes form sections the user doesn't have access to from the DOM.
        * @param self: SPForm
        * @param args?: any = undefined
        * @return void
        */
        implementPermissionsAsync(self: SPForm, args: any = undefined): void {
            try {
                self.updateStatus("Retrieving your permissions...");

                // Remove elements from DOM if current user doesn't belong to any of the SP user groups in an element's attribute `data-sp-groups`.
                self.$form.find("[data-sp-groups], [user-groups]").each(function(i: number, el: HTMLElement): void {

                    // Provide backward compatibility.
                    // Attribute `user-groups` is deprecated and `data-sp-groups` is preferred for HTML5 "correctness."
                    var groups: string = $(el).attr("data-sp-groups");
                    if (!!!groups) {
                        groups = $(el).attr("user-groups");
                    }

                    var groupNames: Array<string> = groups.match(/\,/) != null ? groups.split(',') : [groups];

                    if (self.debug) {
                        console.info('element is restricted to groups...');
                        console.info(groupNames);
                    }

                    var ct = 0;
                    $.each(groupNames, function (j: number, group: string): void {
                        group = group.match(/\;#/) != null ? group.split(';')[0] : group; //either id;#groupname or groupname
                        group = $.trim(group);

                        if (!('groups' in self.currentUser)){ return; }

                        $.each(self.currentUser.groups, function (k: number, g: any): void {
                            if (group == g.name || parseInt(group) == g.id) {
                                ct++;
                            }
                        });
                    });

                    if (ct == 0) {
                        $(el).remove();
                    }
                });

                // Remove element if it's restricted to the author only for example, input elements for editing the form. 
                if (!!self.listItem && self.currentUser.id != self.listItem.CreatedById) {
                    self.$form.find('[data-author-only]').each(function (i: number, el: HTMLElement): void {
                        $(this).remove();
                    });
                }
                
                // Remove element if for non-authors only such as read-only elements for viewers of a form. 
                if (!!self.listItem && self.currentUser.id == self.listItem.CreatedById) {
                    self.$form.find('[data-non-authors]').each(function (i: number, el: HTMLElement): void {
                        $(this).remove();
                    });
                }             

                // Build array of SP field names for the input fields remaning on the form.
                // These are the field names to be saved and current user is allows to edit these.
                var rxExcludeInputTypes: RegExp = /(button|submit|cancel|reset)/;
                var rxIncludeInputTags: RegExp = /(input|select|textarea)/i;
                self.$form.find('[data-bind]').each(function (i: number, e: HTMLElement) {                 
                    if (rxIncludeInputTags.test(e.tagName) && !rxExcludeInputTypes.test($(e).attr('type')) || $(e).attr('contenteditable') == 'true') {
                        var key = Utils.observableNameFromControl(e);
                        self.pushEditableFieldName(key);
                    }
                });

                self.editableFields.sort();

                if (self.debug) {
                    console.info('Editable fields...');
                    console.info(self.editableFields);
                }

                self.nextAsync(true, "Retrieved your permissions.");
            }
            catch (e) {
                if (self.debug) {
                    console.warn('Error in implementPermissionsAsync:');
                    console.warn(e);
                }
                self.logError("implementPermissionsAsync: " + e);
                self.nextAsync(true, "Failed to retrieve your permissions.");
            }
        }

        /**
        * Get the workflow history for this form, if any.
        * @param self: SPForm
        * @param args?: any = undefined
        * @return void
        */
        getHistoryAsync(self: SPForm, args: any = undefined): void {

            if (!!!self.itemId || !self.includeWorkflowHistory) {
                self.nextAsync(true);
                return;
            }

            self.updateStatus('Retrieving workflow history...');

            var filter: string = "ListID eq '" + self.listId + "' and PrimaryItemID eq " + self.itemId;
            var select: string = "Description,DateOccurred";
            var orderby: string = "DateOccurred";
            SpApi.getListItems(self.workflowHistoryListName, callback, self.siteUrl, filter, select, orderby, 25, false);

            function callback(items: Array<any>, error: string) {

                if (self.debug) {
                    console.info('Retrieved workflow hsitory...');
                    console.info(items);
                }

                if (!!error || !!!items) {
                    var msg = 'The ' + self.workflowHistoryListName + ' list may be full at <a href="{url}">{url}</a>. Failed to retrieve workflow history in method, getHistoryAsync().'
                        .replace(/\{url\}/g, self.rootUrl + self.siteUrl + '/Lists/' + self.workflowHistoryListName.replace(/\s/g, '%20'));

                    self.logError(msg);
                    self.nextAsync(false, 'Failed to retrieve workflow history. ' + error);
                    return;
                }

                self.viewModel.historyItems([]);
                for (var i = 0; i < items.length; i++) {
                    self.viewModel.historyItems().push(new HistoryItem(items[i].Description, Utils.parseDate(items[i].DateOccurred)));
                }

                self.viewModel.historyItems.valueHasMutated();
                self.nextAsync(true, "Retrieved workflow history.");
            }

        }

        /**
        * Bind the SP list item values to the view model.
        * @param self: SPForm
        * @param args?: any = undefined
        * @return void
        */
        bindListItemValues(self: SPForm = undefined): void {
            self = self || this;
            try {
                if (!!!self.itemId) { return; }

                var item: ISpItem = self.listItem;
                var vm: IViewModel = self.viewModel;
                
                // Exclude these read-only metadata fields from the Knockout view model.
                var rxExclude: RegExp = /^(__metadata|ContentTypeID|ContentType|CreatedBy|ModifiedBy|Owshiddenversion|Version|Attachments|Path)/;
                var rxExcludeTypes: RegExp = /^(MultiChoice|User|Choice)/;
                var isObj: RegExp = /Object/;

                self.itemId = item.Id;
                vm.Id(item.Id);
                
                for (var key in self.viewModel) {

                    if (!(key in item) || !('_type' in vm[key]) || rxExclude.test(key) || rxExcludeTypes.test(vm[key]._type))
                    { continue; }

                    if ((item[key] != null && vm[key]._type == 'DateTime')) {
                        vm[key](Utils.parseDate(item[key]));
                    }

                    var val = item[key];
                    vm[key](val || null);
                }

                // Created Modified
                vm.Created(Utils.parseDate(item.Created));
                vm.Modified(Utils.parseDate(item.Modified));

                var $info = self.$createdInfo.find('.create-mod-info').empty();
                
                // get CreatedBy profile
                SpApi.executeRestRequest(item.CreatedBy.__deferred.uri, function (data: ISpWrapper<ISpPerson>, status: string, jqXhr: any) {
                    var person: ISpPerson = data.d;
                    vm.CreatedBy(person);
                    vm.CreatedByName(person.Name);
                    vm.CreatedByEmail(person.WorkEMail);
                    if (self.includeUserProfiles) {
                        $info.prepend(Templates.getUserProfileTemplate(person, "Created By"));
                    }
                    vm.isAuthor(self.currentUser.id == person.Id);
                }, true);

                // get ModifiedBy profile
                SpApi.executeRestRequest(item.ModifiedBy.__deferred.uri, function (data: ISpWrapper<ISpPerson>, status: string, jqXhr: any) {
                    var person: ISpPerson = data.d;
                    vm.ModifiedBy(person);
                    vm.ModifiedByName(person.Name);
                    vm.ModifiedByEmail(person.WorkEMail);
                    if (self.includeUserProfiles) {
                        $info.append(Templates.getUserProfileTemplate(person, "Last Modified By"));
                    }
                }, true);

                // Object types `Choice` and `User` will have a corresponding key name plus the suffix `Value` or `Id` for lookups.
                // For example: `SupervisorApproval` is an object container for `__deferred` that corresponds to `SupervisorApprovalValue` which is an ID or string value.

                // query values for the `User` types
                $(self.fieldNames).filter(function (i: number, key: any): boolean {
                    if (!!!self.viewModel[key]) { return false; }
                    return self.viewModel[key]._type == 'User' && (key+'Id') in item;
                }).each(function (i: number, key: any) {
                    self.getPersonById(parseInt(item[key+'Id']), vm[key]);
                });

                // query values for `Choice` types
                $(self.fieldNames).filter(function (i: number, key: any): boolean {
                    if (!!!self.viewModel[key]) { return false; }
                    return self.viewModel[key]._type == 'Choice' && (key+'Value' in item);
                }).each(function (i: number, key: any) {
                    vm[key](item[key+'Value']);
                });

                // query values for MultiChoice types
                $(self.fieldNames).filter(function (i: number, key: any): boolean {
                    return !!self.viewModel[key] && self.viewModel[key]._type == 'MultiChoice' && '__deferred' in item[key];
                }).each(function (i: number, key: any) {

                    SpApi.executeRestRequest(item[key].__deferred.uri, function (data: ISpCollectionWrapper<ISpMultichoiceValue>, status: string, jqXhr: any) {

                        if (self.debug) {
                            console.info('Retrieved MultiChoice data for ' + key + '...');
                            console.info(data);
                        }

                        var values: Array<any> = [];
                        $.each(data.d.results, function (i: number, choice: ISpMultichoiceValue) {
                            values.push(choice.Value);
                        });
                        vm[key](values);
                    });
                });

                // query values for UserMulti types
                $(self.fieldNames).filter(function (i: number, key: any): boolean {
                    return !!self.viewModel[key] && self.viewModel[key]._type == 'UserMulti' && '__deferred' in item[key];
                }).each(function (i: number, key: any) {

                    SpApi.executeRestRequest(item[key].__deferred.uri, function (data: ISpCollectionWrapper<ISpPerson>, status: string, jqXhr: any) {

                        if (self.debug) {
                            console.info('Retrieved UserMulti data for ' + key + '...');
                            console.info(data);
                        }

                        var values: Array<any> = [];
                        $.each(data.d.results, function (i: number, p: ISpPerson) {
                            values.push(p.Id + ';#' + p.Account);
                        });
                        vm[key](values);
                    });
                });


            }
            catch (e) {
                self.logError('Failed to bind form values. ' + JSON.stringify(e));
                if (self.debug) {
                    console.warn(e);
                }
            }
        }

        /**
        * Delete the list item.
        * @param model: IViewModel 
        * @param callback?: Function = undefined
        * @return void
        */
        deleteListItem(model: IViewModel, callback: Function = undefined, timeout: number = 3000): void {

            if (!confirm('Are you sure you want to delete this form?')) { return; }

            var self: SPForm = model.parent;
            var item: ISpItem = self.listItem;

            SpApi.deleteListItem(item, function (data: any, error: string) {
                if (!!error) {
                    if (callback) {
                        callback(data, error);
                    }
                    return;
                }

                self.showDialog("The form was deleted. You'll be redirected in " + timeout / 1000 + " seconds.");
                if (callback) {
                    callback(data);
                }
                setTimeout(function () {
                    window.location.replace(self.sourceUrl != null ? self.sourceUrl : self.rootUrl);
                }, timeout);

            });
        }

        /**
        * Save list item via SOAP services.
        * @param vm: IViewModel
        * @param isSubmit?: boolean = false
        * @param refresh?: boolean = false
        * @param customMsg?: string = undefined
        * @return void
        */
        saveListItem(vm: IViewModel, isSubmit: boolean = false, refresh: boolean = false, customMsg: string = undefined): void {
            var self: SPForm = vm.parent;
            var isNew = !!(self.itemId == null)
                , data = []
                , timeout = 3000
                , saveMsg = customMsg || '<p>Your form has been saved.</p>'
                , fields: Array<Array<any>> = []
                ;

            try {
                //override form validation for clicking "Save" as opposed to "Submit" button
                isSubmit = typeof (isSubmit) == "undefined" ? true : isSubmit;

                //run presave action and stop if the presave action returns false
                if (self.preSave) {
                    var retVal = self.preSave(self, self.viewModel);
                    if (typeof (retVal) != 'undefined' && !!!retVal) {
                        return;
                    }
                }

                //validate the form
                if (isSubmit && !self.formIsValid(vm)) {
                    return;
                }

                //Only update IsSubmitted if it's != true -- if it was already submitted.
                //Otherwise pressing Save would set it from true back to false - breaking any workflow logic in place!
                var isSubmitted: KnockoutObservable<boolean> = vm[ViewModel.isSubmittedKey];
                if (typeof (isSubmitted) != "undefined" && (isSubmitted() == null || isSubmitted() == false)) {
                    fields.push([ViewModel.isSubmittedKey, (isSubmit ? 1 : 0)]);
                }

                $(self.editableFields).each(function (i: number, key: any): void {
                    if (!('_metadata' in vm[key])) { return; }

                    var val: any = vm[key]();
                    var spType = vm[key]._type || vm[key]._metadata.type;
                    spType = !!spType ? spType.toLowerCase() : null;

                    if (typeof (val) == "undefined" || key == ViewModel.isSubmittedKey) { return; }

                    if (val != null && val.constructor === Array) {
                        if (val.length > 0) {
                            val = val.join(';#') + ';#';
                        }
                    }
                    else if (spType == 'datetime' && Utils.parseDate(val) != null) {
                        val = Utils.parseDate(val).toISOString();
                    }
                    else if (val != null && spType == 'note') {
                        val = '<![CDATA[' + $('<div>').html(val).html() + ']]>';
                    }

                    val = val == null ? '' : val;

                    fields.push([vm[key]._name, val]);
                });

                SpSoap.updateListItem(self.itemId, self.listName, fields, isNew, self.siteUrl, callback);
                 
            }
            catch (e) {
                self.logError(e);
                if (self.debug) { throw e; }                
            }

            function callback(xmlDoc: any, status: string, jqXhr: any): void {

                var itemId: number;

                if (self.debug) {
                    console.log('Callback from saveListItem()...');
                    console.log(status);
                    console.log(xmlDoc);
                }

                /*
                // Error response example
                <?xml version="1.0" encoding="utf-8"?>
                <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
                    <soap:Body>
                        <UpdateListItemsResponse xmlns="http://schemas.microsoft.com/sharepoint/soap/">
                            <UpdateListItemsResult>
                                <Results>
                                    <Result ID="1,New">
                                        <ErrorCode>0x80020005</ErrorCode>
                                        <ErrorText>The operation failed because an unexpected error occurred. (Result Code: 0x80020005)</ErrorText>
                                    </Result>
                                </Results>
                            </UpdateListItemsResult>
                        </UpdateListItemsResponse>
                    </soap:Body>
                </soap:Envelope>
                */

                var $errorText = $(xmlDoc).find('ErrorText');
                // catch and handle returned error
                if (!!$errorText && $errorText.text() != "") {
                    self.logError($errorText.text());
                    return;
                }

                $(xmlDoc).find('*').filter(function(): boolean {
                    return this.nodeName == 'z:row';
                }).each(function (i: number, el: any): void {
                    itemId = parseInt($(el).attr('ows_ID'));

                    if (self.itemId == null) {
                        self.itemId = itemId;
                    }

                    if (self.debug) {
                        console.warn('Item ID returned...');
                        console.warn(itemId);
                    }

                });             

                if (isSubmit && !self.debug) {//submitting form
                    self.showDialog('<p>Your form has been submitted. You will be redirected in ' + timeout / 1000 + ' seconds.</p>', 'Form Submission Successful');
                    setTimeout(function () {
                        window.location.href = self.sourceUrl != null ? self.sourceUrl : self.confirmationUrl;
                    }, timeout);
                }
                else {//saving form
                    self.showDialog(saveMsg, 'The form has been saved.', timeout);

                    // Append list item ID to querystring if this is a new form.
                    if (Utils.getIdFromHash() == null && self.itemId != null) {                     
                        setTimeout(function () {
                            //append list item id to hash
                            Utils.setIdHash(self.itemId);
                        }, 10);
                    }
                    else {
                        // refresh data from the server
                        self.getListItemAsync(self);
                        //give WF History list 5 seconds to update
                        setTimeout(function () { self.getHistoryAsync(self); }, 5000);
                    }
                }
            };     
        }


        /**
        * Get attachments for this form. 
        */
        getAttachmentsAsync(self: SPForm, args: any = undefined): void {

            if (!!!self.listItem || !self.enableAttachments) {
                self.nextAsync(true);
                return;
            }

            self.getAttachments(self, function () {
                self.nextAsync(true);
                return;
            });
        }

        /**
        * Add a navigation menu to the form based on parent elements with class `nav-section`
        * @param salef: SPForm
        * @return void
        */
        setupNavigation(self: SPForm): void {

            // Set up a navigation menu at the top of the form if there are elements with the class `nav-section`.
            var $navSections = self.$form.find('.nav-section');

            if ($navSections.length == 0) {
                self.nextAsync(true);
                return;
            }

            // add navigation section to top of form
            self.$form.prepend('<section class="no-print" id="TOP">' +
                '<h4>Navigation</h4>' +
                '<div class="navigation-buttons"></div>' +
                '</section>');

            // include the workflow history section
            self.$form.find('#workflowHistory').addClass('nav-section');

            // add navigation buttons
            self.$form.find(".nav-section:visible").each(function (i, el) {
                var $el = $(el);
                var $header = $el.find("> h4");
                if ($header.length == 0) {
                    return;
                }
                var title = $header.text();
                var anchorName = Utils.toCamelCase(title) + 'Nav';
                $el.before('<div style="height:1px;" id="' + anchorName + '">&nbsp;</div>');
                self.$form.find(".navigation-buttons").append('<a href="#' + anchorName + '" class="btn btn-sm btn-info">' + title + '</a>');
            });

            // add a back-to-top button
            self.$form.append('<a href="#TOP" class="back-to-top"><span class="glyphicon glyphicon-chevron-up"></span></a>');

            // add smooth scrolling to for anchors - animates page navigation
            $('body').delegate('a[href*=#]:not([href=#])', 'click', function () {
                if (window.location.pathname.replace(/^\//, '') == this.pathname.replace(/^\//, '') && location.hostname == this.hostname) {
                    var target = $(this.hash);
                    target = target.length ? target : $('[name=' + this.hash.slice(1) + ']');
                    if (target.length) {
                        $('html,body').animate({
                            scrollTop: target.offset().top - 50
                        }, 1000);

                        return false;
                    }
                }
            });

            self.nextAsync(true);          
        }

        /**
        * Delete an attachment.
        */
        deleteAttachment(att: ISpAttachment, event: any): void {

            if (!confirm('Are you sure you want to delete ' + att.Name + '? This can\'t be undone.')) { return; }
            var self: SPForm = ViewModel.parent;
            var vm: IViewModel = self.viewModel;

            SpApi.deleteAttachment(att, function (data, error) {
                if (!!error) {
                    alert("Failed to delete attachment: " + error);
                    return;
                }

                var attachments: any = vm.attachments;
                attachments.remove(att);
            });

        }

        /**
        * Get the form's attachments
        * @param self: SFForm
        * @param callback: Function (optional)
        * @return void
        */
        getAttachments(self: SPForm = undefined, callback: Function = undefined): void {
            self = self || this;

            if (!!!self.listItem || !self.enableAttachments) {
                if (callback) {
                    callback();
                }
                return;
            }

            var attachments: Array<ISpAttachment> = [];

            SpApi.executeRestRequest(self.listItem.Attachments.__deferred.uri, function (data: ISpCollectionWrapper<ISpAttachment>, status: string, jqXhr: any): void {
                try {
                    $.each(data.d.results, function (i: number, att: ISpAttachment) {
                        attachments.push(att);
                    });
                    self.viewModel.attachments(attachments);
                    self.viewModel.attachments.valueHasMutated();
                    if (callback) {
                        callback(attachments);
                    }
                }
                catch (e) {
                    self.showDialog("Failed to retrieve attachments: " + JSON.stringify(e));
                    if (self.debug) {
                        console.warn(e);
                    }
                }
            });
        }

        /**
        * Log to console in degug mode.
        * @param msg: string
        * @return void
        */
        log(msg): void {
            if (this.debug) {
                console.log(msg);
            }
        }

        /**
        * Update the form status to display feedback to the user.
        * @param msg: string
        * @param success?: boolean = undefined
        * @return void
        */
        updateStatus(msg: string, success: boolean = true): void {
            var self: SPForm = this;

            this.$formStatus
                .html(msg)
                .css('color', (success ? "#ff0" : "$f00"))
                .show();

            setTimeout(function () { self.$formStatus.hide(); }, 2000);
        }

        /**
        * Display a message to the user with jQuery UI Dialog.
        * @param msg: string
        * @param title?: string = undefined
        * @param timeout?: number = undefined
        * @return void
        */
        showDialog(msg: string, title: string = undefined, timeout: number = undefined): void {
            var self: SPForm = this;
            title = title || "Form Dialog";
            msg = (msg).toString().match(/<\w>\w*/) == null ? '<p>' + msg + '</p>' : msg; //wrap non-html in <p>
            self.$dialog.html(msg).dialog('open');
            if (timeout) {
                setTimeout(function () { self.$dialog.dialog('close'); }, timeout);
            }
        }

        /**
        * Validate the View Model's required fields
        * @param model: IViewModel
        * @param showDialog?: boolean = false
        * @return bool
        */
        formIsValid(model: IViewModel, showDialog: boolean = false): boolean {
            var self: SPForm = model.parent,
                labels: Array<string> = [],
                errorCount: number = 0,
                invalidCount: number = 0,
                invalidLabels: Array<string> = []
            ;

            try {

                self.$form.find('.required, [required]').each(function checkRequired(i: number, n: any): void {
                    var p = Utils.observableNameFromControl(n);
                    if (!!p && model[p]) {
                        var val = model[p]();
                        if (val == null || $.trim(val+'').length == 0) {
                            var label = $(n).parent().find('label:first').html();
                            if (!!!label) {
                                $(n).parent().first().html();
                            }
                            if (labels.indexOf(label) < 0) {
                                labels.push(label);
                                errorCount++;
                            }
                        }
                    }
                });

                //check for sp object data errors before saving
                self.$form.find(".invalid").each(function (i: number, el: HTMLElement): void {
                    var $parent = $(el).parent();
                    invalidLabels.push($(parent).first().html());
                    invalidCount++;
                });

                if (invalidCount > 0) {
                    labels.push('<p class="warning">There are validation errors with the following fields. Please correct before saving.</p><p style="color:#f00;">' + invalidLabels.join('<br />') + '</p>');
                }

                //if attachment(s) are required
                if (self.enableAttachments && self.requireAttachments && model.attachments().length == 0) {
                    errorCount++;
                    labels.push(self.attachmentMessage);
                }

                if (errorCount > 0) {
                    return false;
                }
                return true;
            }
            catch (e) {
                self.logError("Form validation error at formIsValid(): " + JSON.stringify(e));
                return false;
            }
        }
        
        /**
        * Get a person by their ID from the User Information list.
        * @param id: number
        * @param callback: Function
        * @return void
        */
        getPersonById(id: number, koField: KnockoutObservable<string>): void {
            var self = this;
            if (!!!id) {
                return;
            }

            SpApi.getPersonById(id, function (person: ISpPerson, error) {
                if (!!error) {
                    var msg = 'Error in SPForm.getPersonById: ' + error;
                    Utils.logError(msg, SPForm.errorLogListName);
                    if (self.debug) {
                        console.warn(msg);
                    }
                    return;
                }
                var name: string = person.Id + ';#' + person.Name;
                koField(name);
                if (self.debug) {
                    console.warn('Retrieved person by ID... ' + name);
                }

            });
        }

        /**
        * Keeps track of field names to send back to the server for create and update operations.
        * Skips field names that:
        *   - have already been added to `ediableFields` array;
        *   - begin with an underscore '_' or dollar sign '$';
        *   - that don't exist in `fieldNames` array which includes both writable and read-only SP list field names;
        *
        * @param key: string
        * @return number: length of array or -1 if not added 
        */
        pushEditableFieldName(key: string): number {
            if (!!!key || this.editableFields.indexOf(key) > -1 || key.match(/^(_|\$)/) != null || this.fieldNames.indexOf(key) < 0 || this.viewModel[key]._readOnly) { return -1; }
            return this.editableFields.push(key);
        }

        /**
        * Log errors to designated SP list.
        * @param msg: string
        * @param self?: SPForm = undefined
        * @return void
        */
        logError(msg: string, self: SPForm = undefined): void {
            self = self || this;
            self.showDialog('<p>An error has occurred and the web administrator has been notified.</p><p>Error Details: <pre>' + msg + '</pre></p>');
            if (self.enableErrorLog) {
                Utils.logError(msg, self.errorLogListName, self.rootUrl, self.debug);
            }
        }
    }

}