import { localize } from '@deriv-com/translations';
import { appendCollapsedProcedureBlocksFields, modifyContextMenu } from '../../../utils';
import { plusIconLight } from '../../images';

window.Blockly.Blocks.procedures_defnoreturn = {
    init() {
        this.arguments = [];
        this.argument_var_models = [];
        this.is_adding = false;
        this.timeout_id;
        this.jsonInit(this.definition());

        if (window.Blockly.Msg.PROCEDURES_DEFNORETURN_COMMENT) {
            this.setCommentText(window.Blockly.Msg.PROCEDURES_DEFNORETURN_COMMENT);
        }

        // Enforce unique procedure names
        const nameField = this.getField('NAME');
        nameField.setValidator(window.Blockly.Procedures.rename);

        // Render a ➕-icon for adding parameters
        const fieldImage = new window.Blockly.FieldImage(plusIconLight, 24, 24, '+', () => this.onAddClick());

        const dropdown_path = `${this.workspace.options.pathToMedia}dropdown-arrow.svg`;
        // Render a v-icon for adding parameters
        const fieldImageCollapse = new window.Blockly.FieldImage(
            dropdown_path,
            16,
            16,
            'v',
            () => this.toggleCollapseWithDelay(true),
            false,
            true
        );
        this.appendDummyInput('ADD_ICON').appendField(fieldImage);
        this.appendDummyInput('COLLAPSED_INPUT').appendField(fieldImageCollapse);

        this.setStatements(true);
    },
    definition() {
        return {
            message0: localize('function {{ function_name }} {{ function_params }}', {
                function_name: '%1',
                function_params: '%2',
            }),
            args0: [
                {
                    type: 'field_input',
                    name: 'NAME',
                    text: '',
                },
                {
                    type: 'field_label',
                    name: 'PARAMS',
                    text: '',
                },
            ],
            inputsInline: true,
            colour: window.Blockly.Colours.Special2.colour,
            colourSecondary: window.Blockly.Colours.Special2.colourSecondary,
            colourTertiary: window.Blockly.Colours.Special2.colourTertiary,
            tooltip: localize('Function with no return value'),
            category: window.Blockly.Categories.Functions,
        };
    },
    meta() {
        return {
            display_name: localize('Function'),
            description: localize(
                'This block creates a function, which is a group of instructions that can be executed at any time. Place other blocks in here to perform any kind of action that you need in your strategy. When all the instructions in a function have been carried out, your bot will continue with the remaining blocks in your strategy. Click the “do something” field to give it a name of your choice. Click the plus icon to send a value (as a named variable) to your function.'
            ),
        };
    },
    /**
     * Sets the block colour and updates this procedure's caller blocks
     * to reflect the same name on a change.
     * @param {!window.Blockly.Events.Abstract} event Change event.
     * @this window.Blockly.Block
     */
    onchange(event) {
        const allowedEvents = [
            window.Blockly.Events.BLOCK_DELETE,
            window.Blockly.Events.BLOCK_CREATE,
            window.Blockly.Events.BLOCK_CHANGE,
        ];

        if (!this.workspace || window.Blockly.derivWorkspace.isFlyoutVisible || !allowedEvents.includes(event.type)) {
            return;
        }
        if (event.type === window.Blockly.Events.BLOCK_CREATE || window.Blockly.Events.BLOCK_CHANGE) {
            // Sync names between definition- and execution-block
            if (event.blockId === this.id && event.name === 'NAME') {
                this.getProcedureCallers().forEach(block => {
                    block.setFieldValue(event.newValue, 'NAME');
                });
            }
            appendCollapsedProcedureBlocksFields(this);
        }
    },
    /**
     * Prompt the user for parameter name
     * @this window.Blockly.Block
     */
    onAddClick() {
        if (this.is_adding || this.workspace.options.readOnly || window.Blockly.derivWorkspace.isFlyoutVisible) {
            return;
        }

        this.is_adding = true;
        clearTimeout(this.timeout_id);

        // Wrap in setTimeout so block doesn't stick to mouse (window.Blockly.Events.END_DRAG event isn't blocked).
        this.timeout_id = setTimeout(() => {
            const promptMessage = localize('Specify a parameter name:');
            window.Blockly.dialog.prompt(promptMessage, '', paramName => {
                if (paramName) {
                    const variable = window.Blockly.Variables.getOrCreateVariablePackage(
                        this.workspace,
                        null,
                        paramName,
                        ''
                    );
                    if (variable) {
                        this.arguments.push(paramName);
                        this.argument_var_models.push(variable);

                        const paramField = this.getField('PARAMS');
                        paramField.setText(`${localize('with: ')} ${this.arguments.join(', ')}`);

                        this.getProcedureCallers().forEach(block => {
                            block.setProcedureParameters(this.arguments);
                            block.initSvg();
                            block.renderEfficiently();
                        });
                    }
                }
                this.is_adding = false;
            });
        }, 0);
    },
    /**
     * Add or remove the statement block from this function definition.
     * @param {boolean} hasStatements True if a statement block is needed.
     * @this window.Blockly.Block
     */
    setStatements(hasStatements) {
        if (this.hasStatements === hasStatements) {
            return;
        }

        if (hasStatements) {
            this.appendStatementInput('STACK').appendField('');
            if (this.getInput('RETURN')) {
                this.moveInputBefore('STACK', 'RETURN');
            }
        } else {
            this.removeInput('STACK', true);
        }

        this.hasStatements = hasStatements;
    },
    /**
     * Update the display of parameters for this procedure definition block.
     * @private
     * @this window.Blockly.Block
     */
    updateParams() {
        let paramString = '';

        if (this.arguments.length) {
            paramString = `${localize('with:')} ${this.arguments.join(', ')}`;
        }

        // The params field is deterministic based on the mutation,
        // no need to fire a change event.
        window.Blockly.Events.disable();
        try {
            this.setFieldValue(paramString, 'PARAMS');
        } finally {
            window.Blockly.Events.enable();
        }
    },
    /**
     * Create XML to represent the argument inputs.
     * @param {boolean=} optParamIds If true include the IDs of the parameter
     *     quarks.  Used by window.Blockly.Procedures.mutateCallers for reconnection.
     * @return {!Element} XML storage element.
     * @this window.Blockly.Block
     */
    mutationToDom(optParamIds) {
        const container = document.createElement('mutation');

        if (optParamIds) {
            container.setAttribute('name', this.getFieldValue('NAME'));
        }

        this.argument_var_models.forEach((arg, i) => {
            const parameter = document.createElement('arg');
            parameter.setAttribute('name', arg.name);
            parameter.setAttribute('varid', arg.getId());

            if (optParamIds && this.paramIds) {
                parameter.setAttribute('paramId', this.paramIds[i]);
            }
            container.appendChild(parameter);
        });

        // Save whether the statement input is visible.
        if (!this.hasStatements) {
            container.setAttribute('statements', 'false');
        }

        return container;
    },
    /**
     * Parse XML to restore the argument inputs.
     * @param {!Element} xmlElement XML storage element.
     * @this window.Blockly.Block
     */
    domToMutation(xmlElement) {
        this.arguments = [];
        this.argument_var_models = [];

        xmlElement.childNodes.forEach(childNode => {
            if (childNode.nodeName.toLowerCase() === 'arg') {
                const var_name = childNode.getAttribute('name');
                const var_id = childNode.getAttribute('varid') || childNode.getAttribute('varId');
                const variable = window.Blockly.Variables.getOrCreateVariablePackage(
                    this.workspace,
                    var_id,
                    var_name,
                    ''
                );

                this.arguments.push(var_name);

                if (variable !== null) {
                    this.argument_var_models.push(variable);
                } else {
                    // eslint-disable-next-line no-console
                    console.log(`Failed to create a variable with name ${var_name}, ignoring.`);
                }
            }
        });

        this.updateParams();

        // Show or hide the statement input.
        this.setStatements(xmlElement.getAttribute('statements') !== 'false');
    },
    /**
     * Return the signature of this procedure definition.
     * @return {!Array} Tuple containing three elements:
     *     - the name of the defined procedure,
     *     - a list of all its arguments,
     *     - that it DOES NOT have a return value.
     * @this window.Blockly.Block
     */
    getProcedureDef() {
        return [this.getFieldValue('NAME'), this.arguments, false];
    },
    /**
     * Return all procedure callers related to this block.
     * @return {!Array.<window.Blockly.Block>} List of procedure caller blocks
     * @this window.Blockly.Block
     */
    getProcedureCallers() {
        return this.workspace
            .getAllBlocks(false)
            .filter(block => block.type === this.callType && block.data === this.id);
    },
    /**
     * Return all variables referenced by this block.
     * @return {!Array.<string>} List of variable names.
     * @this window.Blockly.Block
     */
    getVars() {
        return this.arguments;
    },
    /**
     * Return all variables referenced by this block.
     * @return {!Array.<!window.Blockly.VariableModel>} List of variable models.
     * @this window.Blockly.Block
     */
    getVarModels() {
        return this.argument_var_models;
    },
    /**
     * Add custom menu options to this block's context menu.
     * @param {!Array} options List of menu options to add to.
     * @this window.Blockly.Block
     */
    customContextMenu(options) {
        modifyContextMenu(options);
        if (window.Blockly.derivWorkspace.isFlyoutVisible) {
            return;
        }
        // Add option to create caller.
        const option = { enabled: true };
        const name = this.getFieldValue('NAME');
        option.text = localize('Create "%1"').replace('%1', name);

        const xmlMutation = document.createElement('mutation');
        xmlMutation.setAttribute('name', name);

        this.arguments.forEach(argumentName => {
            const xmlArg = document.createElement('arg');
            xmlArg.setAttribute('name', argumentName);
            xmlMutation.appendChild(xmlArg);
        });

        const xmlBlock = document.createElement('block');
        xmlBlock.setAttribute('type', this.callType);
        xmlBlock.appendChild(xmlMutation);
        option.callback = window.Blockly.ContextMenu.callbackFactory(this, xmlBlock);
        options.push(option);

        // Add options to create getters for each parameter.
        if (!this.isCollapsed()) {
            this.argument_var_models.forEach(argumentVarModel => {
                const getOption = { enabled: true };

                getOption.text = localize('Create "get %1"').replace('%1', argumentVarModel.name);

                const xmlField = window.Blockly.Variables.generateVariableFieldDom(argumentVarModel);
                const xmlOptionBlock = document.createElement('block');

                xmlOptionBlock.setAttribute('type', 'variables_get');
                xmlOptionBlock.appendChild(xmlField);

                getOption.callback = window.Blockly.ContextMenu.callbackFactory(this, xmlOptionBlock);
                options.push(getOption);
            });
        }
    },
    callType: 'procedures_callnoreturn',
};

window.Blockly.JavaScript.javascriptGenerator.forBlock.procedures_defnoreturn = block => {
    // eslint-disable-next-line no-underscore-dangle
    const functionName = window.Blockly.JavaScript.variableDB_.getName(
        block.getFieldValue('NAME'),
        window.Blockly.Procedures.CATEGORY_NAME
    );

    let branch = window.Blockly.JavaScript.javascriptGenerator.statementToCode(block, 'STACK');

    if (window.Blockly.JavaScript.STATEMENT_PREFIX) {
        const id = block.id.replace(/\$/g, '$$$$'); // Issue 251.

        branch =
            window.Blockly.JavaScript.prefixLines(
                window.Blockly.JavaScript.STATEMENT_PREFIX.replace(/%1/g, `'${id}'`),
                window.Blockly.JavaScript.INDENT
            ) + branch;
    }

    if (window.Blockly.JavaScript.INFINITE_LOOP_TRAP) {
        branch = window.Blockly.JavaScript.INFINITE_LOOP_TRAP.replace(/%1/g, `'${block.id}'`) + branch;
    }

    let returnValue =
        window.Blockly.JavaScript.javascriptGenerator.valueToCode(
            block,
            'RETURN',
            window.Blockly.JavaScript.javascriptGenerator.ORDER_NONE
        ) || '';
    if (returnValue) {
        returnValue = `${window.Blockly.JavaScript.INDENT}return ${returnValue};\n`;
    }

    const args = block.arguments.map(
        argumentName =>
            window.Blockly.JavaScript.variableDB_.getName(argumentName, window.Blockly.Variables.CATEGORY_NAME) // eslint-disable-line no-underscore-dangle
    );

    // eslint-disable-next-line no-underscore-dangle
    const code = window.Blockly.JavaScript.javascriptGenerator.scrub_(
        block,
        `
    function ${functionName}(${args.join(', ')}) {
        ${branch}
        ${returnValue}
    }\n`
    );

    // Add % so as not to collide with helper functions in definitions list.
    // eslint-disable-next-line no-underscore-dangle
    window.Blockly.JavaScript.javascriptGenerator.definitions_[`%${functionName}`] = code;
    return null;
};
