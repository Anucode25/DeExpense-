// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ExpenseTracker {
    struct Expense {
        uint256 amount;
        string category;
        string description;
        uint256 timestamp;
        address user;
        bool exists;
    }

    // Mapping from user address to their expenses
    mapping(address => Expense[]) private userExpenses;

    event ExpenseAdded(address indexed user, uint256 amount, string category, string description, uint256 timestamp);
    event ExpenseDeleted(address indexed user, uint256 index);

    /**
     * @dev Adds a new expense for the caller.
     * @param _amount The amount of the expense.
     * @param _category The category of the expense.
     * @param _description A brief description of the expense.
     * @param _timestamp The timestamp of the expense.
     */
    function addExpense(
        uint256 _amount,
        string memory _category,
        string memory _description,
        uint256 _timestamp
    ) public {
        userExpenses[msg.sender].push(Expense({
            amount: _amount,
            category: _category,
            description: _description,
            timestamp: _timestamp,
            user: msg.sender,
            exists: true
        }));

        emit ExpenseAdded(msg.sender, _amount, _category, _description, _timestamp);
    }

    /**
     * @dev Returns all expenses for the caller.
     */
    function getExpenses() public view returns (Expense[] memory) {
        return userExpenses[msg.sender];
    }

    /**
     * @dev Deletes an expense at a specific index for the caller.
     * Note: This replaces the deleted expense with the last one to save gas.
     * @param _index The index of the expense to delete.
     */
    function deleteExpense(uint256 _index) public {
        require(_index < userExpenses[msg.sender].length, "Index out of bounds");
        require(userExpenses[msg.sender][_index].user == msg.sender, "Not authorized");

        // Move the last element to the deleted spot and pop the last element
        uint256 lastIndex = userExpenses[msg.sender].length - 1;
        if (_index != lastIndex) {
            userExpenses[msg.sender][_index] = userExpenses[msg.sender][lastIndex];
        }
        userExpenses[msg.sender].pop();

        emit ExpenseDeleted(msg.sender, _index);
    }

    /**
     * @dev Returns the total number of expenses for the caller.
     */
    function getExpenseCount() public view returns (uint256) {
        return userExpenses[msg.sender].length;
    }
}
